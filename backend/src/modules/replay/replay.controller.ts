import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReplayService } from './replay.service';

@Controller('/replays')
export class ReplayController {
  constructor(private readonly replayService: ReplayService) {}

  @Get('/:replayId/meta')
  getReplayMeta(
    @Param('replayId') replayId: string,
    @Query('uid') uid: string,
  ) {
    // TODO: participants/visibility should come from replay_index query
    return this.replayService.buildAccessMeta({
      replayId,
      uid,
      participants: [uid],
      visibility: 'participants',
      isClubAdmin: false,
    });
  }

  @Get('/:replayId')
  getReplay(@Param('replayId') replayId: string) {
    return this.replayService.fetchReplay(replayId);
  }
}
