import { ForbiddenException, Injectable, TooManyRequestsException } from '@nestjs/common';
import {
  buildRiskRateKey,
  calcRiskLevel,
  decisionByLevel,
  defaultRateRules,
  RateLimitRule,
  RiskEventLog,
} from './risk.policy';

@Injectable()
export class RiskService {
  private readonly counters = new Map<string, { count: number; expireAt: number }>();

  async checkActionRate(uid: string, action: string, deviceId = 'unknown', ipHash = 'unknown') {
    const rule = this.findRule(action);
    if (!rule) return;

    const now = Date.now();
    const keyUid = buildRiskRateKey('uid', uid, rule.action, rule.windowSec);
    const keyDevice = buildRiskRateKey('device', deviceId, rule.action, rule.windowSec);

    const uidCount = this.incrWindowCounter(keyUid, rule.windowSec, now);
    const deviceCount = this.incrWindowCounter(keyDevice, rule.windowSec, now);

    if (uidCount > rule.limit || deviceCount > rule.limit * 2) {
      const riskScore = Math.min(100, 50 + Math.floor((uidCount / rule.limit) * 30));
      const level = calcRiskLevel(riskScore);
      const decision = decisionByLevel(level);

      this.logRiskEvent({
        ts: now,
        traceId: `risk-${now}`,
        uid,
        action,
        riskType: 'RATE_LIMIT',
        riskScore,
        riskLevel: level,
        ruleId: `RL_${rule.action.toUpperCase()}_${rule.windowSec}`,
        decision,
        deviceId,
        ipHash,
        evidence: { uidCount, deviceCount, limit: rule.limit, windowSec: rule.windowSec },
      });

      throw new TooManyRequestsException('RATE_LIMITED');
    }
  }

  async checkBlacklist(uid: string) {
    // TODO: 接 Redis -> risk:blacklist:uid:{uid}
    const isBlocked = false;
    if (isBlocked) throw new ForbiddenException('RISK_BLACKLIST');
  }

  assessRoundSuspicion(input: {
    uid: string;
    winRate100?: number;
    avgHuSec?: number;
    fixedPartnerRate?: number;
    shortRoundCount5m?: number;
    sameDeviceMultiAccount?: boolean;
  }): { score: number; level: 'GREEN' | 'YELLOW' | 'RED' } {
    let score = 0;
    if ((input.winRate100 ?? 0) > 0.75) score += 30;
    if ((input.avgHuSec ?? 99) < 0.8) score += 20;
    if ((input.fixedPartnerRate ?? 0) > 0.6) score += 20;
    if ((input.shortRoundCount5m ?? 0) > 8) score += 15;
    if (input.sameDeviceMultiAccount) score += 25;

    const level = calcRiskLevel(score);
    return { score, level };
  }

  private findRule(action: string): RateLimitRule | undefined {
    return defaultRateRules.find((r) => r.action === action);
  }

  private incrWindowCounter(key: string, windowSec: number, now: number): number {
    const data = this.counters.get(key);
    if (!data || data.expireAt <= now) {
      this.counters.set(key, { count: 1, expireAt: now + windowSec * 1000 });
      return 1;
    }
    data.count += 1;
    return data.count;
  }

  private logRiskEvent(event: RiskEventLog) {
    // TODO: 落地到日志平台 + 审计表
    console.log('[risk]', JSON.stringify(event));
  }
}
