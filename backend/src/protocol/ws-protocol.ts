export type ProtocolVersion = '1.0.0';

export type ClientType =
  | 'C_CONNECT_AUTH'
  | 'C_HEARTBEAT'
  | 'C_ROOM_JOIN'
  | 'C_ROOM_LEAVE'
  | 'C_ACTION'
  | 'C_ACTION_READY'
  | 'C_ACTION_DRAW'
  | 'C_ACTION_DISCARD'
  | 'C_ACTION_PENG'
  | 'C_ACTION_GANG'
  | 'C_ACTION_HU'
  | 'C_ACTION_PASS'
  | 'C_ACTION_CHAT'
  | 'C_ACTION_EMOJI'
  | 'C_SYNC_SNAPSHOT_REQ'
  | 'C_ACK';

export type ServerType =
  | 'S_CONNECTED'
  | 'S_HEARTBEAT'
  | 'S_ROOM_JOINED'
  | 'S_GAME_START'
  | 'S_CARD_DEALT'
  | 'S_CARD_DRAWN'
  | 'S_CARD_DISCARDED'
  | 'S_MELD_DONE'
  | 'S_HU_DONE'
  | 'S_ROUND_END'
  | 'S_GAME_END'
  | 'S_STATE_SNAPSHOT'
  | 'S_DELTA_EVENT'
  | 'S_ERROR';

export type WsType = ClientType | ServerType;

export interface WsEnvelope<T = unknown> {
  ver: ProtocolVersion;
  type: WsType;
  ts: number;
  rid: string;
  uid: string;
  seq: number;
  ack: number;
  payload: T;
}

export interface AckPayload {
  lastAckSeq: number;
  missingSeqs?: number[];
}

export interface ActionPayload {
  actionId: string;
  action: 'READY' | 'DRAW' | 'DISCARD' | 'PENG' | 'GANG' | 'HU' | 'PASS' | 'CHAT' | 'EMOJI';
  data: Record<string, unknown>;
}

export interface DeltaEventPayload {
  eventSeq: number;
  eventType: ServerType;
  patch: Record<string, unknown>;
}

export interface ErrorPayload {
  code: number;
  message: string;
  detail?: Record<string, unknown>;
  retryable: boolean;
}
