import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RoomModule } from './room/room.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [AuthModule, RoomModule, GatewayModule],
})
export class AppModule {}
