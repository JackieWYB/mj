import { Controller, Get, Query } from '@nestjs/common';
import { RecordService } from './record.service';

@Controller('/records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Get('/recent')
  recent(@Query('uid') uid: string, @Query('limit') limit?: string) {
    return this.recordService.queryRecent(uid, Number(limit ?? 20));
  }

  @Get('/by-date')
  byDate(
    @Query('uid') uid: string,
    @Query('date') date: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.recordService.queryByDate(uid, date, Number(page ?? 1), Number(pageSize ?? 20));
  }
}
