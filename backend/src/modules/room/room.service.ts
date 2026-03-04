import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { RecordService } from '../record/record.service';
import { ReplayService } from '../replay/replay.service';
import { RoomAction, RoomEvent, RoomState } from '../../types/room.types';

@Injectable()
export class RoomService {
  private readonly rooms = new Map<string, RoomState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly recordService: RecordService,
    private readonly replayService: ReplayService,
  ) {
    setInterval(() => this.tickDispatch(), 50);
  }

  async joinRoom(roomId: string, uid: string): Promise<RoomState> {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('room_not_found');
    const p = room.players.find((x) => x.uid === uid);
    if (p) p.online = true;
    return room;
  }

  async enqueueAction(action: RoomAction) {
    const room = this.rooms.get(action.roomId);
    if (!room) throw new NotFoundException('room_not_found');

    // 幂等：actionId 去重
    if (room.eventLog.some((e) => e.actionId === action.actionId)) return;
    room.actionQueue.push(action);
  }

  async updateAck(roomId: string, uid: string, lastAckSeq: number) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.uid === uid);
    if (player) player.lastAckSeq = Math.max(player.lastAckSeq, lastAckSeq);
  }

  async markOffline(uid: string) {
    for (const room of this.rooms.values()) {
      const p = room.players.find((x) => x.uid === uid);
      if (p) p.online = false;
    }
  }

  async tryReconnect(uid: string): Promise<{ snapshot: RoomState; deltaEvents: RoomEvent[] } | null> {
    for (const room of this.rooms.values()) {
      const p = room.players.find((x) => x.uid === uid);
      if (!p) continue;
      p.online = true;
      const windowSize = this.configService.getRoomEventResendWindow();
      const deltaEvents = room.eventLog.filter((e) => e.seq > p.lastAckSeq).slice(-windowSize);
      return { snapshot: room, deltaEvents };
    }
    return null;
  }

  // 房间服主循环（权威执行）
  private async tickDispatch() {
    for (const room of this.rooms.values()) {
      while (room.actionQueue.length > 0) {
        const action = room.actionQueue.shift()!;

        // 1) validate(action, state)
        // 2) apply(action) -> new state
        // 3) append event
        const event: RoomEvent = {
          seq: ++room.eventSeq,
          roomId: room.roomId,
          actionId: action.actionId,
          eventType: `applied:${action.actionType}`,
          payload: { uid: action.uid, data: action.data },
          ts: Date.now(),
        };

        room.roundState.lastAction = action.actionType;
        room.eventLog.push(event);

        // 若检测到 round end，触发结算与归档
        if (action.actionType === 'SETTLE') {
          await this.recordService.persistRound(room.roomId, room.roundState.roundId, room.eventLog);
          await this.replayService.archive(room.roomId, room.roundState.roundId, room.eventLog);
        }
      }
    }
  }
}
