import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { RoomModule } from '../room/room.module';

@Module({ imports: [RoomModule], providers: [MatchService], exports: [MatchService] })
export class MatchModule {}
