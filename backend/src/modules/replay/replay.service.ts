import { Injectable, ForbiddenException } from '@nestjs/common';
import { ReplayArchiveResult, ReplayEvent, ReplayHeader } from './replay.types';

@Injectable()
export class ReplayService {
  async archiveByEventSourcing(header: ReplayHeader, events: ReplayEvent[]): Promise<ReplayArchiveResult> {
    // 1) normalize + validate seq
    const normalized = [...events].sort((a, b) => a.seq - b.seq);

    // 2) encode (jsonl or packed)
    const jsonl = normalized.map((e) => JSON.stringify(e)).join('\n');
    const bytes = Buffer.from(jsonl, 'utf8');

    // 3) upload to object storage (placeholder)
    const storageUri = `replay/${new Date().toISOString().slice(0, 10)}/${header.roundId}.jsonl.gz`;

    // 4) persist replay index in MySQL (placeholder)
    // replay_index: replayId, roomId, roundId, participants_json, visibility, storage_uri, size_bytes...

    return {
      replayId: header.replayId,
      storageUri,
      codec: 'jsonl_gzip',
      eventCount: normalized.length,
    };
  }

  async buildAccessMeta(input: {
    replayId: string;
    uid: string;
    participants: string[];
    visibility: 'participants' | 'club_admin' | 'public';
    isClubAdmin?: boolean;
  }) {
    const { replayId, uid, participants, visibility, isClubAdmin } = input;

    const participantAllowed = participants.includes(uid);
    const adminAllowed = visibility === 'club_admin' && isClubAdmin;
    const publicAllowed = visibility === 'public';

    if (!(participantAllowed || adminAllowed || publicAllowed)) {
      throw new ForbiddenException('REPLAY_FORBIDDEN');
    }

    // placeholder: sign object storage url with short ttl
    return {
      replayId,
      url: `https://cdn.example.com/replay/${replayId}?sig=mock&exp=60`,
      expireInSec: 60,
    };
  }

  async fetchReplay(replayId: string) {
    // TODO: load replay index -> permission check -> return access meta
    return { replayId, snapshot: null, events: [] };
  }
}
