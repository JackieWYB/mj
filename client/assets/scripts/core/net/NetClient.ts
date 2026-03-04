import { ActionMessage, WsEnvelope } from './NetTypes';

interface NetHooks {
  onOpen?: () => void;
  onClose?: () => void;
  onSnapshot?: (payload: any) => void;
  onDeltaEvent?: (payload: any, seq: number) => void;
  onError?: (err: any) => void;
}

export class NetClient {
  private ws: WebSocket | null = null;
  private hbTimer: any = null;
  private reconnectTimer: any = null;
  private seq = 1;
  private ack = 0;

  constructor(private readonly url: string, private readonly uid: string, private readonly hooks: NetHooks) {}

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.startHeartbeat();
      this.hooks.onOpen?.();
    };
    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.hooks.onClose?.();
      this.scheduleReconnect();
    };
    this.ws.onerror = (e) => this.hooks.onError?.(e);
    this.ws.onmessage = (evt) => this.handleMessage(evt.data);
  }

  sendAction(rid: string, action: ActionMessage) {
    this.send({
      ver: '1.0.0',
      type: 'C_ACTION',
      ts: Date.now(),
      rid,
      uid: this.uid,
      seq: this.seq++,
      ack: this.ack,
      payload: action,
    });
  }

  sendAck(rid: string, lastAckSeq: number) {
    this.ack = Math.max(this.ack, lastAckSeq);
    this.send({
      ver: '1.0.0',
      type: 'C_ACK',
      ts: Date.now(),
      rid,
      uid: this.uid,
      seq: this.seq++,
      ack: this.ack,
      payload: { lastAckSeq },
    });
  }

  requestSnapshot(rid: string, missingSeqs: number[] = []) {
    this.send({
      ver: '1.0.0',
      type: 'C_SYNC_SNAPSHOT_REQ',
      ts: Date.now(),
      rid,
      uid: this.uid,
      seq: this.seq++,
      ack: this.ack,
      payload: { missingSeqs },
    });
  }

  private handleMessage(raw: string) {
    const msg = JSON.parse(raw) as WsEnvelope<any>;
    if (typeof msg.seq === 'number') this.ack = Math.max(this.ack, msg.seq);

    if (msg.type === 'S_STATE_SNAPSHOT') {
      this.hooks.onSnapshot?.(msg.payload);
      return;
    }
    if (msg.type === 'S_DELTA_EVENT') {
      const seq = msg.payload.eventSeq ?? msg.seq;
      this.hooks.onDeltaEvent?.(msg.payload, seq);
      return;
    }
    if (msg.type === 'S_ERROR') {
      this.hooks.onError?.(msg.payload);
    }
  }

  private send(msg: WsEnvelope<any>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.hbTimer = setInterval(() => {
      this.send({
        ver: '1.0.0',
        type: 'C_HEARTBEAT',
        ts: Date.now(),
        rid: '',
        uid: this.uid,
        seq: this.seq++,
        ack: this.ack,
        payload: {},
      });
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.hbTimer) clearInterval(this.hbTimer);
    this.hbTimer = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 1500);
  }
}
