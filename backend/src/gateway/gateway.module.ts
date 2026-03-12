import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { RoomModule } from '../modules/room/room.module';
import { AccountModule } from '../modules/account/account.module';
import { RiskModule } from '../modules/risk/risk.module';

@Module({
  imports: [RoomModule, AccountModule, RiskModule],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}
