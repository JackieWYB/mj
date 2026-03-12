export type Stage = 'WAIT_READY' | 'PLAYING' | 'ROUND_END' | 'GAME_END';

export interface PlayerViewState {
  uid: string;
  seat: number;
  hand: string[];
  melds: string[][];
  discards: string[];
  score: number;
  online: boolean;
}

export interface SnapshotState {
  rid: string;
  stage: Stage;
  roundId: string;
  dealerUid: string;
  turnUid: string;
  wallLeft: number;
  players: PlayerViewState[];
  lastEventSeq: number;
  rule: Record<string, unknown>;
}

export interface DeltaEvent {
  seq: number;
  eventType: string;
  patch: Record<string, unknown>;
}

export interface GameState extends SnapshotState {
  expectedSeq: number;
  lastAckSeq: number;
  reconnecting: boolean;
}
