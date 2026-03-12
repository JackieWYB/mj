import { Body, Controller, Post } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('/room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post('/create')
  create(@Body() body: { uid: string }) {
    return this.roomService.createRoom(body.uid);
  }

  @Post('/join')
  join(@Body() body: { roomId: string; uid: string }) {
    return this.roomService.joinRoom(body.roomId, body.uid);
  }
}
