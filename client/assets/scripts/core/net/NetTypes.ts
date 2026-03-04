export interface WsEnvelope<T = unknown> {
  ver: string;
  type: string;
  ts: number;
  rid: string;
  uid: string;
  seq: number;
  ack: number;
  payload: T;
}

export interface ActionMessage {
  actionId: string;
  action: 'READY' | 'DRAW' | 'DISCARD' | 'PENG' | 'GANG' | 'HU' | 'PASS' | 'CHAT' | 'EMOJI';
  data: Record<string, unknown>;
}
