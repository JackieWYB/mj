# 麻将回放系统设计（Event Sourcing）

## 1) 回放数据结构定义与示例

## 1.1 事件模型
每局回放由 `header + events[] + checkpoints(optional)` 组成。

```ts
interface ReplayHeader {
  replayId: string;
  gameId: string;
  roomId: string;
  roundId: string;
  ruleVersion: string;
  startedAt: number;
  endedAt: number;
  participants: string[];
  visibility: 'participants' | 'club_admin' | 'public';
  snapshotEvery?: number; // 每N事件关键帧
}

interface ReplayEvent {
  seq: number;
  ts: number;
  type: 'DEAL' | 'DRAW' | 'DISCARD' | 'MELD' | 'HU' | 'SCORE';
  actorUid?: string;
  payload: Record<string, unknown>;
}
```

## 1.2 关键事件 payload 约定
- `DEAL`: `{ dealerUid, handCountsByUid }`
- `DRAW`: `{ uid, tile, wallLeft }`
- `DISCARD`: `{ uid, tile }`
- `MELD`: `{ uid, meldType, tiles, fromUid }`
- `HU`: `{ winnerUid, winType, winTile, fromUid, fanBreakdown }`
- `SCORE`: `{ scoreDeltaByUid, totalByUid }`

## 1.3 存储格式
### A) JSON Lines（推荐调试）
每行一条 `ReplayEvent`：
```jsonl
{"seq":1,"ts":1730000001,"type":"DEAL","payload":{"dealerUid":"U1"}}
{"seq":2,"ts":1730000002,"type":"DRAW","actorUid":"U1","payload":{"tile":"WAN_5","wallLeft":55}}
```

### B) 压缩数组（推荐生产）
```json
{
  "header": {"replayId":"RP_001","roomId":"R_1"},
  "events": [[1,1730000001,"DEAL","U1",{"dealerUid":"U1"}],[2,1730000002,"DRAW","U1",{"tile":"WAN_5"}]],
  "checkpoints": [{"seq":50,"snapshot":"...gzip_base64..."}]
}
```

---

## 2) 存储与索引（MySQL + 对象存储）

## 2.1 MySQL 表
```sql
CREATE TABLE replay_index (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  replay_id VARCHAR(64) NOT NULL UNIQUE,
  game_id VARCHAR(64) NOT NULL,
  room_id VARCHAR(64) NOT NULL,
  round_id VARCHAR(64) NOT NULL,
  owner_uid BIGINT NOT NULL,
  participants_json JSON NOT NULL,
  club_id BIGINT NULL,
  visibility VARCHAR(16) NOT NULL DEFAULT 'participants',
  event_count INT NOT NULL,
  storage_uri VARCHAR(512) NOT NULL,
  checksum VARCHAR(128),
  size_bytes BIGINT,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_round_id(round_id),
  INDEX idx_room_id(room_id),
  INDEX idx_owner_uid(owner_uid),
  INDEX idx_created_at(created_at)
);
```

## 2.2 对象存储路径
- `replay/{yyyy}/{mm}/{dd}/{roundId}.jsonl.gz`
- 或 `replay/{yyyy}/{mm}/{dd}/{roundId}.pack.gz`

## 2.3 拉取方式
1. 客户端请求 `GET /replays/:replayId/meta`
2. 服务端校验权限后返回：
   - `storageUri`（短时签名 URL）
   - `codec`（jsonl_gzip / packed_array_gzip）
   - `eventCount`
3. 客户端下载并本地解码播放

---

## 3) 客户端回放控制器设计（ReplayController）

```ts
class ReplayController {
  load(replayMeta): Promise<void>; // 下载并解码
  play(speed = 1): void;
  pause(): void;
  seekToSeq(seq: number): void; // 跳转到某手/某事件
  setSpeed(speed: 0.5 | 1 | 2 | 4): void;
}
```

### 3.1 设计要点
- 与实战复用同一套 `EventQueue + StateStore + TableView + AnimPlayer`
- `seekToSeq`：优先从最近 checkpoint 快速恢复，再回放增量事件
- 播放控制：
  - 倍速：调整事件间隔与动画速度
  - 暂停：停止定时推进
  - 跳转：重置状态后快速重播

---

## 4) 生成与上传流程（房间结束 -> 落库 -> 上传 -> 可访问ID）

1. **房间结束**：RoomService 收到 `ROUND_END/SCORE` 最终事件。
2. **事件归档**：按 seq 排序，写入内存缓冲（或临时文件）。
3. **编码压缩**：生成 `jsonl.gz` 或 `pack.gz`。
4. **上传对象存储**：返回 `storageUri`。
5. **写 MySQL 索引**：`replay_index` 记录元数据、参与者、可见性、checksum。
6. **生成 replayId**：返回给战绩系统，战绩详情可直接跳转回放。

## 4.1 权限校验（隐私与安全）
默认策略：
- `participants`：仅本局参与者可看
- `club_admin`：俱乐部管理员可看
- `public`：公开（默认关闭）

接口校验顺序：
1. 校验 token
2. 查询 replay_index
3. 判定用户是否参与者 / 俱乐部管理员 / 公开
4. 通过后签发短期 URL（如 60 秒）

## 4.2 异常处理
- 对象不存在：返回 `REPLAY_NOT_READY`（客户端可重试）
- 校验失败：`REPLAY_FORBIDDEN`
- 文件损坏（checksum 不一致）：`REPLAY_CORRUPTED`，触发重建工单

