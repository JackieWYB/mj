# Backend Skeleton (NestJS + ws)

## 目录结构

```text
backend/
  README.md
  docs/architecture.md
  src/
    main.ts
    app.module.ts
    protocol/ws-protocol.ts
    types/room.types.ts
    gateway/
      gateway.module.ts
      game.gateway.ts
    common/guards/ws-auth.guard.ts
    modules/
      account/
        account.module.ts
        account.service.ts
      match/
        match.module.ts
        match.service.ts
      room/
        room.module.ts
        room.service.ts
      record/
        record.module.ts
        record.service.ts
        record.controller.ts
      replay/
        replay.module.ts
        replay.service.ts
        replay.controller.ts
      config/
        config.module.ts
        config.service.ts
      risk/
        risk.module.ts
        risk.service.ts
    infra/
      mysql/schema.sql
      redis/keys.md
```

## 关键流程
- 客户端连接：`auth.connect`（header token）
- 断线重连：`tryReconnect(uid)` 返回 `state_snapshot + deltaEvents`
- 可靠投递：服务端下行事件按 `seq`，客户端 `room.ack` 回传游标
- 房间权威执行：`RoomService.tickDispatch` 消费 `ActionQueue`，写入 `EventLog`

## 说明
- 该目录为“接近可运行”的后端骨架，重点是分层与协议，便于后续快速落地。
- 对局规则裁决建议直接集成 `packages/rule-engine`，在 `RoomService` 中调用 `validate/apply`。
