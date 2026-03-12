import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  getRoomEventResendWindow(): number {
    return 100;
  }

  getHeartbeatTimeoutMs(): number {
    return 15000;
  }
}
