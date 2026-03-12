# 微信小游戏麻将客户端技术方案（Cocos Creator + TypeScript）

## 1) 项目目录结构（assets/scripts/...）

```text
client/
  docs/
    mahjong-client-architecture.md
  assets/
    scripts/
      core/
        controller/
          GameController.ts
        net/
          NetClient.ts
          NetTypes.ts
        store/
          StateStore.ts
        event/
          EventQueue.ts
      view/
        table/
          TableView.ts
        seat/
          HandView.ts
          DiscardView.ts
          MeldView.ts
        ui/
          RoomUI.ts
      anim/
        AnimPlayer.ts
      audio/
        AudioMgr.ts
      router/
        UIRouter.ts
      resource/
        BundleManager.ts
      types/
        GameState.ts
```

### 资源分包建议
- `bundle-table`: 桌面、牌桌底图、方向指示
- `bundle-tile`: 手牌/牌面图集、阴影贴图、高光贴图
- `bundle-fx`: 动画特效、胡牌特效、结算特效
- `bundle-audio`: 背景音、操作音、方言语音
- `bundle-ui`: 通用 UI 图标、弹窗

---

## 2) 核心类职责

## 2.1 NetClient
- 负责 WS 连接、心跳、断线重连、ack、重发请求。
- 输入：`connect/sendAction/sendAck`。
- 输出：`snapshot/event/error/connection-state` 事件。

## 2.2 GameController
- 客户端总协调器：连接 NetClient、StateStore、View 层、AnimPlayer。
- 核心流程：
  1. 收到 `snapshot` -> 重建 State + 重建 Scene
  2. 收到 `event` -> 入事件队列 -> 更新 State -> 播放动画 -> 更新 UI
  3. 用户操作 -> validate(本地提示) -> 发 action

## 2.3 StateStore
- 单一状态源（类似 Redux）
- 维护：`GameState / expectedSeq / lastAckSeq / reconnecting`
- 仅在 reducer 中变更状态，保证可追踪。

## 2.4 TableView / HandView / DiscardView / MeldView
- `TableView`: 桌面总渲染协调（座位布局、剩余牌、轮到提示）
- `HandView`: 手牌布局（按 seat 区分自己与他人）
- `DiscardView`: 弃牌堆网格布局
- `MeldView`: 吃碰杠区域渲染

## 2.5 AnimPlayer
- 封装 timeline/animation clips。
- 支持：`playDeal/playDraw/playDiscard/playMeld/playHu/playSettlement`
- 支持：`interrupt()`、`setSpeed(multiplier)`。

## 2.6 AudioMgr
- 背景音、操作音、方言语音接口。
- 按 server event 触发：例如 `CARD_DISCARDED` 播放出牌音，`HU_DONE` 播放胡牌音。

## 2.7 UIRouter
- 页面路由控制：房间主界面、设置、聊天表情、结算弹窗。

---

## 3) 状态驱动渲染（Event Queue）

### 3.1 核心原则
- 服务端权威：客户端不直接改“规则状态”，仅根据 event 驱动渲染。
- 事件顺序：仅按 `seq` 应用，`seq` 不连续时暂停消费并请求补包。

### 3.2 流程
1. NetClient 收到 `S_DELTA_EVENT(seq=K)`
2. `EventQueue.enqueue(event)`
3. GameController 检查 `K === expectedSeq`
   - 是：
     - `StateStore.applyDelta(event)`
     - `AnimPlayer.playByEvent(event)`
     - `TableView.render(store.state)`
     - `NetClient.sendAck(K)`
     - `expectedSeq++`
   - 否：触发 `requestSnapshotOrResend(missingSeqRange)`

---

## 4) 关键代码示例

## 4.1 收到 snapshot 重建
```ts
onSnapshot(snapshot) {
  store.rebuildFromSnapshot(snapshot);
  tableView.rebuild(snapshot);
  eventQueue.clear();
  store.setExpectedSeq(snapshot.lastEventSeq + 1);
}
```

## 4.2 收到 event 播放发牌动画
```ts
onEvent(evt) {
  eventQueue.enqueue(evt);
  drainQueue();
}

async drainQueue() {
  while (eventQueue.hasNext(store.expectedSeq)) {
    const evt = eventQueue.popNext(store.expectedSeq)!;
    store.applyDelta(evt);
    await animPlayer.playByEvent(evt); // CARD_DEALT -> 发牌动画
    tableView.render(store.state);
    netClient.sendAck(evt.seq);
    store.expectedSeq += 1;
  }
}
```

## 4.3 出牌交互 -> 发 action
```ts
onClickDiscard(tile: string) {
  if (!store.canOperate('DISCARD')) return;
  netClient.sendAction({
    actionId: uuid(),
    action: 'DISCARD',
    data: { tile },
  });
}
```

---

## 5) 2.5D 实现细节

## 5.1 层级与深度
- 逻辑层级建议：
  - `table_bg` < `discard` < `meld` < `hand` < `fx` < `ui`
- 对应 `zIndex/siblingIndex` 固化管理，避免动态排序抖动。

## 5.2 缩放与透视
- 通过 `seat` 设置基础缩放与倾斜：
  - 自己手牌：scale 1.0
  - 对家/侧家：scale 0.78~0.88 + y 方向压缩
- 使用 2D 仿透视：
  - 节点旋转小角度（x/y）
  - 牌叠放按行列偏移营造纵深感

## 5.3 阴影/高光策略
- 每张牌挂 1 个 shadow sprite（可复用）
- 高光使用 overlay sprite 或 shader keyword
- 阴影贴图统一图集，避免单独材质导致批次暴涨

## 5.4 批处理与对象池
- 手牌、弃牌、碰杠牌均使用对象池：`TileNodePool`
- 批处理关键：
  - 同图集同材质
  - 减少节点层级深度
  - 避免每帧 setSpriteFrame

---

## 6) 性能建议

1. **节点复用**：牌节点/特效节点池化，减少 instantiate/destroy。
2. **合图**：牌面图集按主题分组，控制纹理切换。
3. **减少透明叠加**：阴影与特效尽量裁剪范围，减少 overdraw。
4. **动画降级**：低端机关闭部分粒子与高光动态效果。
5. **帧率策略**：
   - 默认 60fps（中高端）
   - 低端/发热降级 30fps
6. **网络节流**：聊天/表情频率限制，ack 合并上报。
7. **重连保护**：重连中禁用操作按钮，防止重复 action。

