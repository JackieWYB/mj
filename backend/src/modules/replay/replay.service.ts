import { Injectable } from '@nestjs/common';
import { RoomEvent } from '../../types/room.types';

@Injectable()
export class ReplayService {
  async archive(roomId: string, roundId: string, events: RoomEvent[]) {
    // TODO: 对象存储 event stream + keyframe
    return { replayId: `${roomId}:${roundId}`, eventCount: events.length };
  }

  async fetchReplay(replayId: string) {
    // TODO: load from mysql/object storage
    return { replayId, snapshot: null, events: [] };
  }
}
