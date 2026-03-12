export type Message = { type: string; payload?: Record<string, unknown> };

export class NetClient {
  private ws: WebSocket | null = null;
  constructor(private url: string, private onMessage: (m: Message) => void) {}

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.onMessage({ type: 'NET_OPEN' });
    this.ws.onclose = () => this.onMessage({ type: 'NET_CLOSE' });
    this.ws.onmessage = (evt) => this.onMessage(JSON.parse(String(evt.data)));
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type, payload }));
  }
}
