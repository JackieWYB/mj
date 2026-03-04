import { ForbiddenException, Injectable, TooManyRequestsException } from '@nestjs/common';

@Injectable()
export class RiskService {
  async checkActionRate(uid: string, op: string) {
    // TODO: Redis INCR + TTL
    if (!uid || !op) throw new TooManyRequestsException('invalid_rate_key');
  }

  async checkBlacklist(uid: string) {
    // TODO: risk:blacklist:{uid} / risk:greylist:{uid}
    const isBlocked = false;
    if (isBlocked) throw new ForbiddenException('risk_blacklist');
  }
}
