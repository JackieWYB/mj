// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { BasicHuEvaluator, BasicScoreCalculator, MahjongRuleEngine } from '../src/engine.js';
import { createInitialState, defaultRuleConfig } from '../src/factory.js';
import type { Action, DomainEvent, Seat, TileCode } from '../src/types.js';

const action = (type: Action['type'], actor: Seat, extra: Record<string, unknown> = {}): Action => ({
  type,
  actor,
  actionId: `${type}-${actor}-${Math.random().toString(36).slice(2)}`,
  ts: Date.now(),
  ...(extra as never),
}) as Action;

const baseState = () =>
  createInitialState({
    gameId: 'g1',
    roundId: 'r1',
    dealerSeat: 0,
    wallTiles: ['WAN_5', 'WAN_6', 'WAN_7'] as TileCode[],
    initialHands: {
      0: ['WAN_1', 'WAN_2', 'WAN_3', 'WAN_4'],
      1: ['TONG_1', 'TONG_2', 'TONG_3', 'TONG_4'],
      2: ['TIAO_1', 'TIAO_2', 'TIAO_3', 'TIAO_4'],
    },
  });

test('validate rejects discard in WAIT_READY', () => {
  const engine = new MahjongRuleEngine(new BasicHuEvaluator(), new BasicScoreCalculator());
  const state = baseState();
  const result = engine.validate(action('DISCARD', 0, { tile: 'WAN_1' }), state, defaultRuleConfig);
  assert.equal(result.ok, false);
});

test('apply supports idempotency with same actionId', () => {
  const engine = new MahjongRuleEngine(new BasicHuEvaluator(), new BasicScoreCalculator());
  let state = baseState();
  state = engine.apply(action('READY', 0), state, defaultRuleConfig);
  state = engine.apply(action('READY', 1), state, defaultRuleConfig);

  const a = { ...action('READY', 2), actionId: 'fixed-id' } as Action;
  const next = engine.apply(a, state, defaultRuleConfig);
  const again = engine.apply(a, next, defaultRuleConfig);

  assert.equal(next.version, again.version);
  assert.equal(next.actionLog.length, again.actionLog.length);
});

test('reduce drives round to ROUND_SETTLED', () => {
  const engine = new MahjongRuleEngine(new BasicHuEvaluator(), new BasicScoreCalculator());
  const state = baseState();

  const actions: Action[] = [
    action('READY', 0),
    action('READY', 1),
    action('READY', 2),
    action('DEAL', 0),
    action('DRAW', 0),
    action('HU', 0, { winTile: 'WAN_5', winType: 'ZIMO' }),
    action('SETTLE', 0),
  ];

  const finalState = engine.reduce(actions, state, defaultRuleConfig);
  assert.equal(finalState.stage, 'ROUND_SETTLED');
  assert.equal(finalState.result?.winnerSeat, 0);
});

test('replay ingests event sourcing stream', () => {
  const engine = new MahjongRuleEngine(new BasicHuEvaluator(), new BasicScoreCalculator());
  const state = baseState();
  const events: DomainEvent[] = [
    {
      seq: 1,
      actionId: 'a1',
      actionType: 'READY',
      actor: 0,
      stageAfter: 'WAIT_READY',
      payload: {},
      stateHash: 'x1',
      ts: 1,
    },
    {
      seq: 2,
      actionId: 'a2',
      actionType: 'READY',
      actor: 1,
      stageAfter: 'WAIT_READY',
      payload: {},
      stateHash: 'x2',
      ts: 2,
    },
    {
      seq: 3,
      actionId: 'a3',
      actionType: 'READY',
      actor: 2,
      stageAfter: 'DEAL',
      payload: {},
      stateHash: 'x3',
      ts: 3,
    },
  ];

  const finalState = engine.replay(events, state);
  assert.equal(finalState.stage, 'DEAL');
  assert.equal(finalState.actionLog.length, 3);
});
