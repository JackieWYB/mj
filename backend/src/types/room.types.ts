export type RoomStage = 'WAIT_READY' | 'DEAL' | 'PLAYING' | 'ROUND_END' | 'ROUND_SETTLED';

export interface PlayerState {
  uid: string;
  seat: number;
  online: boolean;
  lastAckSeq: number;
  trustee: boolean;
}

export interface RoundState {
  roundId: string;
  turnSeat: number;
  wallIndex: number;
  lastAction?: string;
  settlement?: Record<string, unknown>;
}

export interface RoomEvent {
  seq: number;
  roomId: string;
  actionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  ts: number;
}

export interface RoomState {
  roomId: string;
  mode: 'MATCH' | 'FRIEND';
  stage: RoomStage;
  players: PlayerState[];
  roundState: RoundState;
  eventSeq: number;
  eventLog: RoomEvent[];
  actionQueue: RoomAction[];
  configVersion: string;
}

export interface RoomAction {
  roomId: string;
  uid: string;
  actionId: string;
  actionType: string;
  data: Record<string, unknown>;
  ts: number;
}
