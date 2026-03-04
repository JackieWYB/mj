import {
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { AuthService } from '../auth/auth.service';
import { RoomService } from '../room/room.service';

interface C2S {
  type: 'AUTH' | 'JOIN_ROOM' | 'READY' | 'END_GAME' | 'PING';
  payload?: Record<string, any>;
}

@WebSocketGateway({ path: process.env.SERVER_WS_PATH || '/ws' })
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(private readonly auth: AuthService, private readonly roomService: RoomService) {}

  handleConnection(client: WebSocket) {
    client.send(JSON.stringify({ type: 'WELCOME', payload: { msg: 'connected' } }));
  }

  @SubscribeMessage('message')
  onMessage(client: WebSocket, @MessageBody() raw: string | C2S) {
    const msg: C2S = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!msg?.type) return;

    if (msg.type === 'AUTH') {
      const token = msg.payload?.token;
      const user = this.auth.verify(token);
      (client as any).uid = user.uid;
      client.send(JSON.stringify({ type: 'AUTH_OK', payload: user }));
      return;
    }

    const uid = (client as any).uid as string;
    if (!uid) {
      client.send(JSON.stringify({ type: 'ERROR', payload: { message: 'unauthorized' } }));
      return;
    }

    if (msg.type === 'PING') {
      client.send(JSON.stringify({ type: 'PONG', payload: { ts: Date.now() } }));
      return;
    }

    if (msg.type === 'JOIN_ROOM') {
      const roomId = String(msg.payload?.roomId);
      const room = this.roomService.joinRoom(roomId, uid);
      client.send(JSON.stringify({ type: 'ROOM_JOINED', payload: room }));
      return;
    }

    if (msg.type === 'READY') {
      const roomId = String(msg.payload?.roomId);
      const events = this.roomService.markReady(roomId, uid);
      events.forEach((evt) => client.send(JSON.stringify({ type: evt.type, payload: evt })));
      return;
    }

    if (msg.type === 'END_GAME') {
      const roomId = String(msg.payload?.roomId);
      const evt = this.roomService.endGame(roomId);
      client.send(JSON.stringify({ type: evt.type, payload: evt }));
    }
  }
}
