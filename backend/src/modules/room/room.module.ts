import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { ConfigModule } from '../config/config.module';
import { RecordModule } from '../record/record.module';
import { ReplayModule } from '../replay/replay.module';

@Module({
  imports: [ConfigModule, RecordModule, ReplayModule],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
