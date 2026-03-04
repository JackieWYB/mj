export type ReplayVisibility = 'participants' | 'club_admin' | 'public';

export type ReplayEventType = 'DEAL' | 'DRAW' | 'DISCARD' | 'MELD' | 'HU' | 'SCORE';

export interface ReplayHeader {
  replayId: string;
  gameId: string;
  roomId: string;
  roundId: string;
  ruleVersion: string;
  startedAt: number;
  endedAt: number;
  participants: string[];
  visibility: ReplayVisibility;
  snapshotEvery?: number;
}

export interface ReplayEvent {
  seq: number;
  ts: number;
  type: ReplayEventType;
  actorUid?: string;
  payload: Record<string, unknown>;
}

export interface ReplayArchiveResult {
  replayId: string;
  storageUri: string;
  codec: 'jsonl_gzip' | 'packed_array_gzip';
  eventCount: number;
}
