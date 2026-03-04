# NestJS + ws 后端服务设计（卡五星）

## 1) 服务拆分
- **Gateway（WebSocketGateway）**
  - 连接鉴权、消息编解码、心跳、ack 管理、错误下发
  - 只做接入与转发，不做规则裁决
- **AccountService**
  - token 校验、用户信息、黑灰名单标签
- **MatchService**
  - 快速匹配、段位匹配（简版 Elo 区间）
  - 匹配成功后调用 RoomService 分配座位
- **RoomService（权威）**
  - 房间生命周期、状态机、ActionQueue、EventLog
  - 调用规则引擎 validate/apply，产出 event_push
- **RecordService**
  - 局结算落库、最近对局查询、按日期分页
- **ReplayService**
  - 事件流/关键帧存储，回放拉取
- **ConfigService**
  - 房规配置、心跳阈值、重发窗口等动态配置
- **RiskService**
  - 限流、异常频率检测、黑灰名单判定

## 2) WebSocket 协议
- `auth.connect`：连接鉴权
- `heartbeat.ping / heartbeat.pong`
- `room.join / room.leave`
- `room.action`（客户端意图）
- `room.state_snapshot`
- `room.event_push`
- `room.ack`
- `error`

### 2.1 包结构
```json
{
  "op": "room.action",
  "traceId": "uuid",
  "ts": 1730000000000,
  "token": "optional-after-connect",
  "payload": {}
}
```

### 2.2 可靠投递
- 每个连接维护 `sendSeq`（服务端下行递增）
- 客户端 `room.ack` 上报 `lastAckSeq`
- 服务端缓存最近 `N` 条事件（Redis List / ring buffer）
- 重连时按 `lastAckSeq` 返回 `snapshot + deltaEvents`

## 3) Room 内部模型
- `RoomState`
  - roomId、stage、players、roundState、eventSeq、configVersion
- `PlayerState`
  - uid、seat、online、lastAckSeq、trustee
- `RoundState`
  - turn、wallIndex、lastAction、settlement
- `ActionQueue`
  - 入队 action（带 actionId 去重）
- `EventLog`
  - append-only，支持 replayId 导出

## 4) 数据存储
### 4.1 MySQL
- `users(id, openid, nickname, avatar, rank_score, risk_tag, created_at)`
- `rooms(room_id, mode, status, owner_uid, rule_json, started_at, ended_at)`
- `records(id, room_id, round_id, uid, score_delta, rank, result_json, created_at)`
- `replays(id, room_id, round_id, event_blob_url, keyframe_blob_url, created_at)`
- `pay_orders(order_id, uid, sku_id, amount, status, wx_txn_id, created_at, paid_at)`

### 4.2 Redis
- `room:state:{roomId}` -> RoomState snapshot
- `room:event:{roomId}` -> recent N events (list)
- `room:ack:{roomId}:{uid}` -> lastAckSeq
- `player:session:{uid}` -> current connection/session
- `match:queue:{mode}:{segment}` -> zset
- `risk:freq:{uid}:{op}` -> counter + ttl
- `risk:blacklist:{uid}` / `risk:greylist:{uid}`

## 5) 水平扩展
- 按 `roomId` 哈希路由到固定 Room Pod（Redis 注册路由表）
- WebSocket 网关可多实例：
  - 方案A：L4 sticky session（同连接稳定）
  - 方案B：网关无状态 + RPC 转发到 Room Pod
- 对局权威状态仅在 Room Pod + Redis checkpoint，避免多主

## 6) 安全
- token + nonce + timestamp 签名
- `actionId` 幂等 + nonce 窗口防重放
- DTO 参数校验（class-validator/zod）
- 风控拦截：超频 action、异常 join/leave、黑名单拒绝
