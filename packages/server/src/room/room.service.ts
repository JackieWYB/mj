import { Injectable, NotFoundException } from '@nestjs/common';
import { Room, RoomEvent } from './room.types';

@Injectable()
export class RoomService {
  private rooms = new Map<string, Room>();

  createRoom(ownerUid: string) {
    const roomId = `R${Date.now()}`;
    const room: Room = { roomId, stage: 'READY', players: [{ uid: ownerUid, ready: false }], eventSeq: 0 };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, uid: string) {
    const room = this.getRoom(roomId);
    if (!room.players.find((p) => p.uid === uid)) room.players.push({ uid, ready: false });
    return room;
  }

  markReady(roomId: string, uid: string): RoomEvent[] {
    const room = this.getRoom(roomId);
    const p = room.players.find((x) => x.uid === uid);
    if (!p) throw new NotFoundException('player_not_in_room');
    p.ready = true;

    const events: RoomEvent[] = [this.pushEvent(room, 'PLAYER_READY', { uid })];
    if (room.players.length >= 2 && room.players.every((x) => x.ready) && room.stage === 'READY') {
      room.stage = 'DEAL';
      events.push(this.pushEvent(room, 'DEAL_START', { stage: room.stage }));
      room.stage = 'PLAYING';
      events.push(this.pushEvent(room, 'PLAYING_START', { stage: room.stage }));
    }
    return events;
  }

  endGame(roomId: string): RoomEvent {
    const room = this.getRoom(roomId);
    room.stage = 'END';
    return this.pushEvent(room, 'GAME_END', { stage: room.stage });
  }

  syncState(roomId: string): RoomEvent {
    const room = this.getRoom(roomId);
    return this.pushEvent(room, 'STATE_SYNC', { room });
  }

  private pushEvent(room: Room, type: RoomEvent['type'], payload: Record<string, unknown>): RoomEvent {
    room.eventSeq += 1;
    return { eventSeq: room.eventSeq, roomId: room.roomId, type, payload };
  }

  private getRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('room_not_found');
    return room;
  }
}
