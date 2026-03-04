import { Injectable } from '@nestjs/common';
import { RoomEvent } from '../../types/room.types';

@Injectable()
export class RecordService {
  async persistRound(roomId: string, roundId: string, events: RoomEvent[]) {
    // TODO: MySQL records + summary 写入
    return { roomId, roundId, eventCount: events.length };
  }

  async queryRecent(uid: string, limit = 20) {
    // SELECT ... WHERE uid=? ORDER BY created_at DESC LIMIT ?
    return { uid, items: [], limit };
  }

  async queryByDate(uid: string, date: string, page = 1, pageSize = 20) {
    // 按日期分页
    return { uid, date, page, pageSize, items: [] };
  }
}
