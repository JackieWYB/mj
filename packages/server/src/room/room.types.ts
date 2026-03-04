export type RoomStage = 'READY' | 'DEAL' | 'PLAYING' | 'END';

export interface Player {
  uid: string;
  ready: boolean;
}

export interface Room {
  roomId: string;
  stage: RoomStage;
  players: Player[];
  eventSeq: number;
}

export interface RoomEvent {
  eventSeq: number;
  roomId: string;
  type: 'ROOM_JOINED' | 'PLAYER_READY' | 'DEAL_START' | 'PLAYING_START' | 'GAME_END' | 'STATE_SYNC';
  payload: Record<string, unknown>;
}
