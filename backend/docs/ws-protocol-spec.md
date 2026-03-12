# 微信小游戏麻将 WS JSON 协议规范（可扩展 Protobuf）

## 0. 设计目标
- 客户端只发**意图 action**，服务端下发**权威 event**。
- 每条消息统一信封：`type, ts, rid, uid, seq, ack, payload`。
- 支持 `snapshot + delta events` 重连恢复。
- 支持事件回放，客户端校验 `seq` 连续性。
- 兼容演进：字段向后兼容，可平滑迁移到 protobuf。

---

## 1) 通用消息信封

### 1.1 Envelope Schema
```json
{
  "ver": "1.0.0",
  "type": "C_ACTION_DISCARD",
  "ts": 1730000000000,
  "rid": "R10001",
  "uid": "U90001",
  "seq": 102,
  "ack": 100,
  "payload": {}
}
```

### 1.2 字段定义
- `ver` `string`：协议版本（SemVer）
- `type` `string`：消息类型（见第2节）
- `ts` `number`：毫秒时间戳
- `rid` `string`：roomId
- `uid` `string`：用户ID
- `seq` `number`：
  - C->S：客户端消息序号（单连接单调递增）
  - S->C：服务端事件序号（房间维度单调递增）
- `ack` `number`：已确认对端最大序号
- `payload` `object`：业务体

---

## 2) 消息类型枚举

## 2.1 客户端 -> 服务端（意图 Action）
- `C_CONNECT_AUTH`
- `C_HEARTBEAT`
- `C_ROOM_JOIN`
- `C_ROOM_LEAVE`
- `C_ACTION_READY`
- `C_ACTION_DRAW`
- `C_ACTION_DISCARD`
- `C_ACTION_PENG`
- `C_ACTION_GANG`
- `C_ACTION_HU`
- `C_ACTION_PASS`
- `C_ACTION_CHAT`
- `C_ACTION_EMOJI`
- `C_SYNC_SNAPSHOT_REQ`
- `C_ACK`

## 2.2 服务端 -> 客户端（权威 Event）
- `S_CONNECTED`
- `S_HEARTBEAT`
- `S_ROOM_JOINED`
- `S_GAME_START`
- `S_CARD_DEALT`
- `S_CARD_DRAWN`
- `S_CARD_DISCARDED`
- `S_MELD_DONE`
- `S_HU_DONE`
- `S_ROUND_END`
- `S_GAME_END`
- `S_STATE_SNAPSHOT`
- `S_DELTA_EVENT`
- `S_ERROR`

---

## 3) Action 列表（字段与示例）

> 所有 Action payload 都必须包含 `actionId`（UUID），用于幂等去重。

### 3.1 READY
**type**: `C_ACTION_READY`
```json
{ "payload": { "actionId": "a-001" } }
```

### 3.2 DRAW
**type**: `C_ACTION_DRAW`
```json
{ "payload": { "actionId": "a-002" } }
```

### 3.3 DISCARD
**type**: `C_ACTION_DISCARD`
```json
{ "payload": { "actionId": "a-003", "tile": "WAN_5" } }
```

### 3.4 PENG
**type**: `C_ACTION_PENG`
```json
{ "payload": { "actionId": "a-004", "tile": "TONG_9", "fromUid": "U90002" } }
```

### 3.5 GANG
**type**: `C_ACTION_GANG`
```json
{ "payload": { "actionId": "a-005", "tile": "TIAO_3", "gangType": "AN_GANG", "fromUid": null } }
```

### 3.6 HU
**type**: `C_ACTION_HU`
```json
{ "payload": { "actionId": "a-006", "winTile": "WAN_5", "winType": "ZIMO", "fromUid": null } }
```

### 3.7 PASS
**type**: `C_ACTION_PASS`
```json
{ "payload": { "actionId": "a-007" } }
```

### 3.8 CHAT
**type**: `C_ACTION_CHAT`
```json
{ "payload": { "actionId": "a-008", "text": "快点出牌~" } }
```

### 3.9 EMOJI
**type**: `C_ACTION_EMOJI`
```json
{ "payload": { "actionId": "a-009", "emojiId": "smile_01", "toUid": "U90003" } }
```

---

## 4) Server Event 列表（字段与示例）

### 4.1 ROOM_JOINED
**type**: `S_ROOM_JOINED`
```json
{
  "payload": {
    "room": { "rid": "R10001", "stage": "WAIT_READY" },
    "players": [{ "uid": "U90001", "seat": 0, "online": true }]
  }
}
```

### 4.2 GAME_START
**type**: `S_GAME_START`
```json
{ "payload": { "roundId": "RD001", "dealerUid": "U90001", "stage": "PLAYING" } }
```

### 4.3 CARD_DEALT
**type**: `S_CARD_DEALT`
```json
{ "payload": { "roundId": "RD001", "handCount": 13 } }
```

### 4.4 CARD_DRAWN
**type**: `S_CARD_DRAWN`
```json
{ "payload": { "roundId": "RD001", "uid": "U90001", "tile": "WAN_5", "wallLeft": 54 } }
```

### 4.5 CARD_DISCARDED
**type**: `S_CARD_DISCARDED`
```json
{ "payload": { "roundId": "RD001", "uid": "U90001", "tile": "WAN_5" } }
```

### 4.6 MELD_DONE
**type**: `S_MELD_DONE`
```json
{ "payload": { "roundId": "RD001", "uid": "U90002", "meldType": "PENG", "tiles": ["WAN_5","WAN_5","WAN_5"] } }
```

### 4.7 HU_DONE
**type**: `S_HU_DONE`
```json
{ "payload": { "roundId": "RD001", "winnerUid": "U90001", "winType": "ZIMO", "fan": [{"name":"PING_HU","value":1}] } }
```

### 4.8 ROUND_END
**type**: `S_ROUND_END`
```json
{ "payload": { "roundId": "RD001", "scoreDelta": {"U90001": 6, "U90002": -3, "U90003": -3} } }
```

### 4.9 GAME_END
**type**: `S_GAME_END`
```json
{ "payload": { "rid": "R10001", "finalScores": {"U90001": 18, "U90002": -9, "U90003": -9} } }
```

---

## 5) Snapshot 与 Delta Event

## 5.1 Snapshot（完整状态）
**type**: `S_STATE_SNAPSHOT`
```json
{
  "payload": {
    "rid": "R10001",
    "stage": "PLAYING",
    "roundId": "RD001",
    "dealerUid": "U90001",
    "turnUid": "U90002",
    "wallLeft": 45,
    "players": [
      {
        "uid": "U90001",
        "seat": 0,
        "hand": ["WAN_1","WAN_2"],
        "melds": [],
        "discards": ["TONG_1"],
        "score": 12,
        "online": true
      }
    ],
    "lastEventSeq": 210,
    "rule": { "qidui": true, "maxFan": 8 }
  }
}
```

## 5.2 Delta（最小变更）
**type**: `S_DELTA_EVENT`
```json
{
  "payload": {
    "eventSeq": 211,
    "eventType": "CARD_DISCARDED",
    "patch": {
      "turnUid": "U90003",
      "players.U90002.discards.append": "WAN_9",
      "lastDiscard": { "uid": "U90002", "tile": "WAN_9" }
    }
  }
}
```

说明：
- `patch` 仅含最小变更字段（可用 JSON-Patch 或自定义 path-op）。
- 客户端必须以 `eventSeq` 顺序应用，若断档（例如收到213但缺212）应触发重传或补快照。

---

## 6) ACK & Resend 机制

1. **服务端下行事件序号**
   - 每房间维护 `eventSeq` 单调递增。
   - 所有权威事件都携带 `seq=eventSeq`。

2. **客户端确认**
   - 客户端处理完成后发送 `C_ACK`：
```json
{
  "type": "C_ACK",
  "ts": 1730000001234,
  "rid": "R10001",
  "uid": "U90001",
  "seq": 56,
  "ack": 211,
  "payload": { "lastAckSeq": 211 }
}
```

3. **服务端缓存与重发**
   - 服务端缓存最近 `N` 条事件（建议 100~500，可按房间活跃度调节）。
   - 若收到客户端 `ack` 小于当前 `eventSeq`，则重发 `(ack+1...latest)` 范围事件。

4. **断线重连恢复**
   - 客户端重连时带 `lastAckSeq`。
   - 服务端返回：
     - `S_STATE_SNAPSHOT`（完整态）
     - `S_DELTA_EVENT[]`（`eventSeq > lastAckSeq`）

5. **连续性校验**
   - 客户端维护 `expectedSeq`。
   - 若收到 `seq < expectedSeq`：丢弃重复包；
   - 若 `seq > expectedSeq`：请求重传 `C_SYNC_SNAPSHOT_REQ` 或 `C_ACK` 携带缺口信息。

---

## 7) 错误码规范

### 7.1 错误消息结构
**type**: `S_ERROR`
```json
{
  "payload": {
    "code": 2004,
    "message": "invalid_action_stage",
    "detail": { "stage": "WAIT_READY", "action": "DISCARD" },
    "retryable": false
  }
}
```

### 7.2 错误码段
- `1000-1099`：连接/鉴权
  - `1001 token_invalid`
  - `1002 token_expired`
  - `1003 signature_invalid`
- `2000-2099`：房间/对局
  - `2001 room_not_found`
  - `2002 not_in_room`
  - `2003 seq_gap_detected`
  - `2004 invalid_action_stage`
  - `2005 invalid_action_payload`
  - `2006 action_duplicate`
- `3000-3099`：风控
  - `3001 rate_limited`
  - `3002 blacklist_blocked`
  - `3003 replay_attack_detected`
- `5000-5099`：服务内部
  - `5001 internal_error`
  - `5002 service_unavailable`

---

## 8) 版本号与兼容策略

1. `ver` 使用 SemVer：`major.minor.patch`。
2. **向后兼容原则**：
   - 新增字段只追加，不删除旧字段；
   - 客户端应忽略未知字段；
   - 新增 type 需在 capability 协商后启用。
3. **破坏性变更**（major 变更）策略：
   - 灰度期间网关做双协议适配（v1/v2）；
   - 房间建立时锁定协议版本；
   - 回放服务按版本解码事件。
4. **向 Protobuf 迁移**：
   - 保留语义字段不变（type/seq/ack/payload映射）；
   - 使用 `oneof` 表达 action/event 载荷；
   - JSON 与 PB 可通过网关层做双向编解码。
