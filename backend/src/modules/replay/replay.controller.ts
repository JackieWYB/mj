import { Controller, Get, Param } from '@nestjs/common';
import { ReplayService } from './replay.service';

@Controller('/replays')
export class ReplayController {
  constructor(private readonly replayService: ReplayService) {}

  @Get('/:replayId')
  getReplay(@Param('replayId') replayId: string) {
    return this.replayService.fetchReplay(replayId);
  }
}
