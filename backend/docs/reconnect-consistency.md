# 麻将状态同步：断线重连 + 一致性保证（实现规范）

> 目标：服务端权威、客户端仅渲染；在弱网/断线/重连下保持状态一致、事件不重不漏、动作幂等。

## 1. 核心模型

## 1.1 服务端状态
- `roomEventSeq`：房间全局事件序号（单调递增）
- `connSendSeq`：每个连接的下行发送序号（单调递增）
- `eventRingBuffer[N]`：最近 N 条权威事件（按 `eventSeq`）
- `playerAckSeq[uid]`：玩家确认到的最大 `eventSeq`
- `actionDedup:{uid}:{actionId}`：动作幂等窗口（TTL）

## 1.2 客户端状态
- `lastEventSeq`：已成功应用的最大事件序号
- `pendingEvents`：乱序缓冲（`eventSeq -> event`）
- `inflightActions`：待确认动作（`actionId -> payload`）

---

## 2. 时序图（文字）

### 2.1 正常对局同步
1. Client 发送 `C_ACTION(actionId=A1)`。
2. Server 校验 + 幂等去重 + 执行规则引擎，生成 `eventSeq=120`。
3. Server 广播 `S_DELTA_EVENT(seq=120)` 并写入 ring buffer。
4. Client 应用后回 `C_ACK(lastEventSeq=120)`。
5. Server 更新 `playerAckSeq[uid]=120`。

### 2.2 断线重连（标准）
1. 心跳超时/连接断开，Client 进入 `RECONNECTING`，UI 显示“重连中”。
2. Client 指数退避重连并发送 `C_RECONNECT_AUTH{token,rid,lastEventSeq}`。
3. Server 鉴权、检查房间成员关系。
4. Server 回 `S_STATE_SNAPSHOT{snapshotSeq=200,state}`。
5. Server 回放 `eventSeq=201..latest` 的 `S_DELTA_EVENT[]`。
6. Client 先替换为 snapshot，再按 seq 连续应用 delta。
7. Client 回 `C_ACK(lastEventSeq=latest)`，恢复操作按钮。

### 2.3 缺包处理
1. Client 收到 `eventSeq=315`，但本地 `expected=313`。
2. Client 暂存 315，并发 `C_RESEND_REQ{fromSeq=313,toSeq=314}`。
3. Server 若 ring buffer 命中，补发 313-314。
4. 若 buffer 未命中，返回 `S_STATE_SNAPSHOT` 全量重建。

---

## 3. 协议字段要求

### 3.1 Snapshot
```json
{
  "type": "S_STATE_SNAPSHOT",
  "rid": "R1001",
  "seq": 501,
  "payload": {
    "snapshotSeq": 500,
    "state": { "stage": "PLAYING", "turnUid": "U2", "wallLeft": 37, "players": [] }
  }
}
```

### 3.2 Delta
```json
{
  "type": "S_DELTA_EVENT",
  "rid": "R1001",
  "seq": 502,
  "payload": {
    "eventSeq": 501,
    "eventType": "CARD_DISCARDED",
    "patch": { "turnUid": "U3", "lastDiscard": { "uid": "U2", "tile": "WAN_9" } }
  }
}
```

> 约束：`payload.eventSeq` 必须连续。`seq` 可用于连接层发送序号统计，`eventSeq` 用于业务一致性。

---

## 4. 幂等与一致性策略

## 4.1 客户端事件幂等
- 若 `eventSeq <= lastEventSeq`：丢弃（重复包）
- 若 `eventSeq == lastEventSeq + 1`：应用并 `lastEventSeq++`
- 若 `eventSeq > lastEventSeq + 1`：缓存并请求重发/快照

## 4.2 服务端动作幂等
- Action 必带 `actionId`
- 服务端先查 `actionDedup:{uid}:{actionId}`：
  - 存在：直接返回 `ACK_DUPLICATE`
  - 不存在：执行规则引擎；成功后写入 dedup（TTL 60~300s）

## 4.3 快照与增量一致性
- 快照必须带 `snapshotSeq`
- 仅回放 `snapshotSeq+1..latest`
- 若 `snapshotSeq < client.lastEventSeq`，以服务端快照为准重建

---

## 5. 网络抖动处理

## 5.1 心跳
- 心跳间隔：5s
- 读超时阈值：15s（3次心跳）
- 连续 2 次超时 -> 标记弱网并提示
- 连续 3 次超时 -> 断线重连

## 5.2 指数退避重连
- 重连间隔：1s -> 2s -> 4s -> 8s（上限 10s）
- 每次重连带 `lastEventSeq`
- 超过总时长（如 60s）提示“网络异常，可返回大厅”

## 5.3 UI策略
- `RECONNECTING`：遮罩 + 倒计时 + 禁用操作按钮
- `RECOVERING`：正在同步快照/事件
- `RECOVERED`：恢复提示 1s 后消失

---

## 6. 伪代码（可直接落地）

## 6.1 Server: 广播与缓存
```ts
function publishRoomEvent(roomId: string, evt: RoomEvent) {
  room.eventSeq += 1;
  evt.eventSeq = room.eventSeq;
  ringBufferPush(room.eventBuffer, evt, N);
  for (const conn of room.connections) {
    conn.sendSeq += 1;
    wsSend(conn, {
      type: 'S_DELTA_EVENT',
      seq: conn.sendSeq,
      rid: roomId,
      payload: evt,
    });
  }
}
```

## 6.2 Server: 重连恢复
```ts
async function handleReconnect(uid, rid, lastEventSeq) {
  auth(uid);
  const room = getRoom(rid);
  if (!room) return error('ROOM_NOT_FOUND');
  if (!room.hasPlayer(uid)) return error('NOT_IN_ROOM');
  if (room.isFinished()) return error('ROUND_ALREADY_END');
  if (room.isKicked(uid)) return error('PLAYER_KICKED');

  const snapshot = buildSnapshot(room); // snapshotSeq = room.eventSeq
  send(uid, { type: 'S_STATE_SNAPSHOT', payload: snapshot });

  const deltas = room.eventBuffer.filter(e => e.eventSeq > snapshot.snapshotSeq ? false : false);
  // 正确做法：快照后重新取 latest，并发送 snapshotSeq+1..latest
  const from = snapshot.snapshotSeq + 1;
  const latest = room.eventSeq;
  const patches = getEventsRange(room, from, latest);
  if (!patches.complete) {
    // 缓冲不全，回退为新快照
    return send(uid, { type: 'S_STATE_SNAPSHOT', payload: buildSnapshot(room) });
  }
  patches.events.forEach(evt => send(uid, { type: 'S_DELTA_EVENT', payload: evt }));
}
```

## 6.3 Client: 事件应用
```ts
function onDelta(evt) {
  const seq = evt.eventSeq;
  if (seq <= state.lastEventSeq) return; // duplicate
  if (seq === state.lastEventSeq + 1) {
    apply(evt);
    state.lastEventSeq = seq;
    flushBuffered();
    sendAck(seq);
    return;
  }
  pending.set(seq, evt);
  requestResend(state.lastEventSeq + 1, seq - 1);
}
```

## 6.4 Client: 重连
```ts
async function reconnectLoop() {
  let delay = 1000;
  for (let total = 0; total < 60000; total += delay) {
    try {
      showReconnectUI();
      await connect();
      send({ type: 'C_RECONNECT_AUTH', payload: { token, rid, lastEventSeq } });
      return;
    } catch {
      await sleep(delay);
      delay = Math.min(delay * 2, 10000);
    }
  }
  showFatalNetworkDialog();
}
```

---

## 7. 异常场景清单

1. **重连到已结束对局**
   - 返回 `ROUND_ALREADY_END`
   - 客户端跳战绩详情/结算页

2. **房间不存在**
   - 返回 `ROOM_NOT_FOUND`
   - 客户端回大厅

3. **被踢出房间**
   - 返回 `PLAYER_KICKED`
   - 客户端展示提示并回大厅

4. **多端登录（同 uid 新连接踢旧连接）**
   - 旧连接收到 `MULTI_LOGIN_KICK`
   - 新连接接管 session，旧连接禁用操作

5. **事件缓存不足无法补齐缺口**
   - 服务端下发新快照
   - 客户端丢弃 pending，按快照重建

6. **客户端 action 重发**
   - 服务端 dedup 命中，不重复执行
   - 客户端收到 duplicate ack 后清除 inflight

7. **ack 丢失**
   - 服务端按 `playerAckSeq` 未前进判定未确认，周期性重发最近窗口

---

## 8. 参数建议（默认值）
- `N(事件缓存窗口)`：200
- `heartbeatIntervalMs`：5000
- `heartbeatTimeoutMs`：15000
- `reconnectMaxTotalMs`：60000
- `actionDedupTTL`：120s

