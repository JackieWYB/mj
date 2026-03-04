export type WsOp =
  | 'auth.connect'
  | 'heartbeat.ping'
  | 'heartbeat.pong'
  | 'room.join'
  | 'room.leave'
  | 'room.action'
  | 'room.state_snapshot'
  | 'room.event_push'
  | 'room.ack'
  | 'error';

export interface WsEnvelope<T = unknown> {
  op: WsOp;
  traceId: string;
  ts: number;
  token?: string;
  payload: T;
}

export interface AckPayload {
  roomId: string;
  lastAckSeq: number;
}

export interface ActionPayload {
  roomId: string;
  actionId: string;
  actionType: string;
  data: Record<string, unknown>;
}
