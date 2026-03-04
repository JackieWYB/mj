# 卡五星麻将规则引擎设计（TypeScript）

> 目标：纯逻辑、可复用（服务端 + 客户端提示），服务端权威裁定，支持事件溯源、幂等、可重放。

## 1) 核心接口设计

```ts
interface IMahjongRuleEngine {
  validate(action: Action, state: GameState, config: RoomRuleConfig): ValidationResult;
  apply(action: Action, state: GameState, config: RoomRuleConfig): GameState;
  reduce(actions: Action[], initialState: GameState, config: RoomRuleConfig): GameState;
  replay(events: DomainEvent[], initialState: GameState): GameState;
}
```

### 1.1 GameState（核心状态）
- 关键字段：
  - `stage`: 当前阶段
  - `currentTurn`: 当前出牌位
  - `players[seat].hand/melds/discards`
  - `wall.nextIndex`
  - `lastDiscard`
  - `actionLog`（DomainEvent 列表）
  - `appliedActionIds`（幂等去重）
  - `version`（状态版本）

### 1.2 Action（动作集合）
- `READY / DEAL / DRAW / DISCARD / CHI / PENG / GANG / HU / PASS / SETTLE`
- 每个动作都带 `actionId + actor + ts`
- 通过 `validate(action, state)` 执行合法性检查后，`apply` 才允许变更状态

### 1.3 Reducer 语义
- 纯函数式：输入 `state + action` 返回新 `state`
- 不做 UI 逻辑，不依赖渲染
- `reduce(actions)` 用于离线回放、批处理恢复

## 2) 状态机阶段定义

- `WAIT_READY`：等待玩家准备
- `DEAL`：发牌准备阶段（可扩展庄家骰子、配牌策略）
- `PLAYING`：回合中（摸打、吃碰杠胡）
- `ROUND_END`：已胡牌或流局，等待结算确认
- `ROUND_SETTLED`：本局分数写入完成

### 2.1 状态迁移（典型）
`WAIT_READY -> DEAL -> PLAYING -> ROUND_END -> ROUND_SETTLED`

## 3) 关键算法（可插拔）

### 3.1 胡牌判定接口（IHuEvaluator）
- 引擎不硬编码所有胡型，调用 `IHuEvaluator.evaluate(state, ctx, config)`
- 返回：`isWin + huType + fanSeeds`
- 可按房间配置开关：七对、卡五星特胡、封顶番等

### 3.2 牌型检测策略（IHandPatternDetector）
- 将番型检测拆为策略插件：
  - `PingHuDetector`
  - `QiDuiDetector`
  - `KaWuXingDetector`
- 通过组合策略拼装玩法（地方化规则差异最小化改动）

### 3.3 算分接口（IScoreCalculator）
- 输入：胜者、点炮者、胡牌方式、自摸附加、番型列表
- 输出：`RoundResult`（分项番型 + 三家分数增减）

## 4) 简化流程示例（事件日志）

示例条件：3人局，Seat0 为庄，Seat0 自摸胡。

1. `READY@seat0` -> stage: WAIT_READY
2. `READY@seat1` -> stage: WAIT_READY
3. `READY@seat2` -> stage: DEAL
4. `DEAL@seat0` -> stage: PLAYING
5. `DRAW@seat0` -> seat0 hand +1
6. `DISCARD@seat0(tile=TONG_3)` -> lastDiscard=(0,TONG_3), turn=seat1
7. `DRAW@seat1` -> seat1 hand +1
8. `DISCARD@seat1(tile=WAN_9)` -> turn=seat2
9. `DRAW@seat2` -> seat2 hand +1
10. `DISCARD@seat2(tile=TIAO_1)` -> turn=seat0
11. `DRAW@seat0(tile=WAN_5)` -> 形成可胡牌型
12. `HU@seat0(winType=ZIMO, winTile=WAN_5)` -> stage: ROUND_END, result 生成
13. `SETTLE@seat0` -> stage: ROUND_SETTLED, 玩家分数入账

说明：
- 每条动作入 `actionLog`，生成递增 `seq` 与 `stateHash`。
- 重复 `actionId` 再次 apply 时将被幂等忽略（返回同状态快照）。

## 5) 单元测试方案

### 5.1 用例组织
- `engine.validate.spec.ts`: 校验拒绝场景（阶段错误、越权、非法牌）
- `engine.apply.spec.ts`: 正常流程（READY->DEAL->PLAYING->HU->SETTLE）
- `engine.idempotency.spec.ts`: 重复 actionId 的幂等性
- `engine.replay.spec.ts`: action/event 回放一致性
- `engine.scoring.spec.ts`: 自摸/点炮/封顶番计分

### 5.2 覆盖点
- 状态机合法迁移/非法迁移
- 每个动作的 `validate` 分支
- 听牌提示开关与番型开关
- 胡牌判定插件替换正确性
- 事件日志 seq 连续、stateHash 可追踪
- 重放后关键字段一致（stage/currentTurn/result/scoreDelta）

---

## 代码落点
- `packages/rule-engine/src/types.ts`: 接口与模型
- `packages/rule-engine/src/engine.ts`: validate/apply/reduce/replay + 默认判胡/算分
- `packages/rule-engine/src/factory.ts`: 初始状态与默认规则配置
- `packages/rule-engine/test/engine.test.ts`: 关键行为测试（Node test）
