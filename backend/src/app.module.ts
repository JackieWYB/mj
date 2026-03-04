import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { AccountModule } from './modules/account/account.module';
import { MatchModule } from './modules/match/match.module';
import { RoomModule } from './modules/room/room.module';
import { RecordModule } from './modules/record/record.module';
import { ReplayModule } from './modules/replay/replay.module';
import { ConfigModule } from './modules/config/config.module';
import { RiskModule } from './modules/risk/risk.module';

@Module({
  imports: [GatewayModule, AccountModule, MatchModule, RoomModule, RecordModule, ReplayModule, ConfigModule, RiskModule],
})
export class AppModule {}
