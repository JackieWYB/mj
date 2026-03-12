import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [AuthModule, RoomModule],
  providers: [GameGateway],
})
export class GatewayModule {}
