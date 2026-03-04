export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';
export type RiskDecision = 'ALLOW' | 'WARN' | 'THROTTLE' | 'MATCH_RESTRICT' | 'TEMP_BAN' | 'PERM_BAN';

export interface RateLimitRule {
  action: 'login' | 'match' | 'room_create' | 'room_join' | 'room_leave' | 'chat' | 'reconnect';
  limit: number;
  windowSec: number;
  levelOnHit: RiskLevel;
}

export interface RiskEventLog {
  ts: number;
  traceId: string;
  uid: string;
  roomId?: string;
  roundId?: string;
  action: string;
  riskType: string;
  riskScore: number;
  riskLevel: RiskLevel;
  ruleId: string;
  decision: RiskDecision;
  deviceId?: string;
  ipHash?: string;
  evidence?: Record<string, unknown>;
}

export const defaultRateRules: RateLimitRule[] = [
  { action: 'login', limit: 10, windowSec: 60, levelOnHit: 'YELLOW' },
  { action: 'match', limit: 20, windowSec: 60, levelOnHit: 'YELLOW' },
  { action: 'room_create', limit: 10, windowSec: 3600, levelOnHit: 'YELLOW' },
  { action: 'room_join', limit: 60, windowSec: 3600, levelOnHit: 'YELLOW' },
  { action: 'room_leave', limit: 30, windowSec: 3600, levelOnHit: 'YELLOW' },
  { action: 'chat', limit: 30, windowSec: 60, levelOnHit: 'GREEN' },
  { action: 'reconnect', limit: 15, windowSec: 600, levelOnHit: 'YELLOW' },
];

export const buildRiskRateKey = (scope: 'uid' | 'device' | 'ip', id: string, action: string, windowSec: number) =>
  `risk:rate:${scope}:${id}:${action}:${windowSec}`;

export const calcRiskLevel = (riskScore: number): RiskLevel => {
  if (riskScore >= 80) return 'RED';
  if (riskScore >= 50) return 'YELLOW';
  return 'GREEN';
};

export const decisionByLevel = (level: RiskLevel): RiskDecision => {
  if (level === 'RED') return 'TEMP_BAN';
  if (level === 'YELLOW') return 'THROTTLE';
  return 'ALLOW';
};
