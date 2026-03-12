import { NetClient, Message } from './NetClient';
import { UILogPanel } from '../ui/UILogPanel';

export class GameClient {
  private net: NetClient;
  private roomId = '';

  constructor(private ui: UILogPanel, wsUrl: string, private token: string) {
    this.net = new NetClient(wsUrl, (m) => this.onMessage(m));
  }

  start() {
    this.ui.log('connecting...');
    this.net.connect();
  }

  joinRoom(roomId: string) {
    this.roomId = roomId;
    this.net.send('JOIN_ROOM', { roomId });
    this.ui.log(`join room -> ${roomId}`);
  }

  ready() {
    this.net.send('READY', { roomId: this.roomId });
    this.ui.log('send READY');
  }

  private onMessage(msg: Message) {
    this.ui.log(`recv: ${msg.type}`);
    if (msg.type === 'NET_OPEN') {
      this.net.send('AUTH', { token: this.token });
    }
    if (msg.type === 'AUTH_OK' && this.roomId) {
      this.net.send('JOIN_ROOM', { roomId: this.roomId });
    }
  }
}
