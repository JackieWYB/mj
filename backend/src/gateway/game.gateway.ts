import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { WsEnvelope, AckPayload, ActionPayload } from '../protocol/ws-protocol';
import { AccountService } from '../modules/account/account.service';
import { RoomService } from '../modules/room/room.service';
import { RiskService } from '../modules/risk/risk.service';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';

@WebSocketGateway({ path: '/ws/game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly accountService: AccountService,
    private readonly roomService: RoomService,
    private readonly riskService: RiskService,
  ) {}

  async handleConnection(client: WebSocket, req: { headers: Record<string, string> }) {
    const token = req.headers['authorization'];
    const user = await this.accountService.verifyToken(token);
    (client as any).uid = user.uid;

    // 断线重连：携带 lastAckSeq，返回 snapshot + delta
    const restore = await this.roomService.tryReconnect(user.uid);
    if (restore) {
      client.send(JSON.stringify({ type: 'S_STATE_SNAPSHOT', payload: restore.snapshot }));
      for (const evt of restore.deltaEvents) {
        client.send(JSON.stringify({ type: 'S_DELTA_EVENT', payload: evt }));
      }
    }
  }

  async handleDisconnect(client: WebSocket) {
    const uid = (client as any).uid as string;
    if (uid) await this.roomService.markOffline(uid);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('C_HEARTBEAT')
  onPing(@ConnectedSocket() client: WebSocket) {
    client.send(JSON.stringify({ type: 'S_HEARTBEAT', ts: Date.now(), payload: {} }));
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('C_ROOM_JOIN')
  async onJoin(@ConnectedSocket() client: WebSocket, @MessageBody() msg: WsEnvelope<{ roomId: string }>) {
    const uid = (client as any).uid as string;
    const state = await this.roomService.joinRoom(msg.payload.roomId, uid);
    client.send(JSON.stringify({ type: 'S_STATE_SNAPSHOT', payload: state }));
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('C_ACTION')
  async onAction(@ConnectedSocket() client: WebSocket, @MessageBody() msg: WsEnvelope<ActionPayload>) {
    const uid = (client as any).uid as string;
    await this.riskService.checkActionRate(uid, msg.type);
    await this.roomService.enqueueAction({
      roomId: msg.rid,
      uid,
      actionId: msg.payload.actionId,
      actionType: msg.payload.action,
      data: msg.payload.data,
      ts: msg.ts,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('C_ACK')
  async onAck(@ConnectedSocket() client: WebSocket, @MessageBody() msg: WsEnvelope<AckPayload>) {
    const uid = (client as any).uid as string;
    await this.roomService.updateAck(msg.rid, uid, msg.payload.lastAckSeq);
  }
}
