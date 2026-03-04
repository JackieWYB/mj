# Redis Key 设计

- `room:state:{roomId}`: 房间快照(JSON)
- `room:event:{roomId}`: 最近N条事件(list)
- `room:ack:{roomId}:{uid}`: 客户端最后ack seq
- `player:session:{uid}`: 当前连接信息
- `match:queue:quick:{mode}`: 快速匹配池(zset)
- `match:queue:rank:{segment}`: 段位匹配池(zset)
- `risk:freq:{uid}:{op}`: 行为频率计数器
- `risk:blacklist:{uid}`: 黑名单标记
- `risk:greylist:{uid}`: 灰名单标记
