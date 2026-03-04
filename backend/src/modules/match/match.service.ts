import { Injectable } from '@nestjs/common';

@Injectable()
export class MatchService {
  async enqueueQuickMatch(uid: string, mode: string) {
    // TODO: Redis zset -> match:queue:{mode}:global
    return { ticketId: `${mode}:${uid}:${Date.now()}` };
  }

  async enqueueRankMatch(uid: string, rankScore: number) {
    const segment = Math.floor(rankScore / 100);
    // TODO: match:queue:rank:{segment}
    return { ticketId: `rank:${segment}:${uid}:${Date.now()}` };
  }

  async joinFriendRoom(uid: string, roomNo: string) {
    // TODO: roomNo -> roomId 映射
    return { uid, roomNo };
  }
}
