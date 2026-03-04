import {
  Action,
  DomainEvent,
  GameState,
  IHuEvaluator,
  IMahjongRuleEngine,
  IScoreCalculator,
  RoomRuleConfig,
  ScoreContext,
  Seat,
  ValidationResult,
} from './types.js';

const nextSeat = (seat: Seat): Seat => ((seat + 1) % 3) as Seat;

const cloneState = (state: GameState): GameState => JSON.parse(JSON.stringify(state));

const stableHash = (state: GameState): string => {
  const stable = JSON.stringify({
    stage: state.stage,
    turn: state.currentTurn,
    players: state.players,
    wallNext: state.wall.nextIndex,
    lastDiscard: state.lastDiscard,
    version: state.version,
  });
  let hash = 0;
  for (let i = 0; i < stable.length; i += 1) {
    hash = (hash * 31 + stable.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
};

const removeFirst = (arr: string[], tile: string): boolean => {
  const index = arr.indexOf(tile);
  if (index < 0) return false;
  arr.splice(index, 1);
  return true;
};

export class BasicHuEvaluator implements IHuEvaluator {
  evaluate(state: GameState, ctx: { actor: Seat; winTile: string; winType: 'ZIMO' | 'DIANPAO' }, config: RoomRuleConfig) {
    const handBase = [...state.players[ctx.actor].hand];
    const hand = (ctx.winType === 'DIANPAO' ? [...handBase, ctx.winTile] : handBase).sort();
    const map = new Map<string, number>();
    for (const t of hand) map.set(t, (map.get(t) ?? 0) + 1);

    const pairs = Array.from(map.values()).filter((v) => v === 2).length;
    const quads = Array.from(map.values()).filter((v) => v === 4).length;
    if (config.qiduiEnabled && pairs + quads * 2 === 7) {
      return { isWin: true, huType: 'QI_DUI', fanSeeds: ['QI_DUI'] };
    }

    // 可插拔：默认仅示例，不实现完整卡五星所有胡型
    return { isWin: hand.length % 3 === 2, huType: 'PING_HU', fanSeeds: ['PING_HU'] };
  }
}

export class BasicScoreCalculator implements IScoreCalculator {
  private fanValueByType: Record<string, number> = {
    PING_HU: 1,
    QI_DUI: 2,
    ZI_MO: 1,
  };

  calculate(state: GameState, ctx: ScoreContext, config: RoomRuleConfig) {
    const fanList = [...ctx.fanTypes];
    if (ctx.winType === 'ZIMO') fanList.push('ZI_MO');

    let fan = fanList.reduce((sum, t) => sum + (this.fanValueByType[t] ?? 0), 0);
    fan = Math.min(fan, config.maxFan);
    const point = fan * config.baseScore;

    const finalScoreBySeat: Record<Seat, number> = { 0: 0, 1: 0, 2: 0 };

    if (ctx.winType === 'ZIMO') {
      for (const seat of [0, 1, 2] as Seat[]) {
        if (seat === ctx.winnerSeat) continue;
        finalScoreBySeat[seat] -= point;
        finalScoreBySeat[ctx.winnerSeat] += point;
      }
    } else {
      const loserSeat = ctx.loserSeat!;
      finalScoreBySeat[loserSeat] -= point * 2;
      finalScoreBySeat[ctx.winnerSeat] += point * 2;
    }

    return {
      winnerSeat: ctx.winnerSeat,
      winType: ctx.winType,
      loserSeat: ctx.loserSeat,
      fanBreakdown: fanList.map((f) => ({ fanType: f, fanValue: this.fanValueByType[f] ?? 0 })),
      finalScoreBySeat,
    };
  }
}

export class MahjongRuleEngine implements IMahjongRuleEngine {
  constructor(private huEvaluator: IHuEvaluator, private scoreCalculator: IScoreCalculator) {}

  validate(action: Action, state: GameState, config: RoomRuleConfig): ValidationResult {
    if (state.appliedActionIds[action.actionId]) return { ok: true };

    if (action.type === 'READY') {
      if (state.stage !== 'WAIT_READY') return { ok: false, reason: 'stage_not_wait_ready' };
      return { ok: true };
    }

    if (action.type === 'DEAL') {
      if (state.stage !== 'DEAL') return { ok: false, reason: 'stage_not_deal' };
      if (action.actor !== state.dealerSeat) return { ok: false, reason: 'only_dealer_can_deal' };
      return { ok: true };
    }

    if (state.stage !== 'PLAYING' && !['HU', 'SETTLE'].includes(action.type)) {
      return { ok: false, reason: 'stage_not_playing' };
    }

    if (action.type === 'DRAW') {
      if (action.actor !== state.currentTurn) return { ok: false, reason: 'not_your_turn' };
      if (state.wall.nextIndex >= state.wall.tiles.length) return { ok: false, reason: 'wall_empty' };
      return { ok: true };
    }

    if (action.type === 'DISCARD') {
      if (action.actor !== state.currentTurn) return { ok: false, reason: 'not_your_turn' };
      if (!state.players[action.actor].hand.includes(action.tile)) return { ok: false, reason: 'tile_not_in_hand' };
      return { ok: true };
    }

    if (action.type === 'CHI') {
      if (!config.allowChi) return { ok: false, reason: 'chi_disabled' };
      if (!state.lastDiscard || state.lastDiscard.seat !== action.fromSeat) return { ok: false, reason: 'invalid_from_seat' };
      if (nextSeat(action.fromSeat) !== action.actor) return { ok: false, reason: 'chi_only_next_player' };
      return { ok: true };
    }

    if (action.type === 'PENG') {
      if (!config.allowPeng) return { ok: false, reason: 'peng_disabled' };
      if (!state.lastDiscard || state.lastDiscard.tile !== action.tile) return { ok: false, reason: 'invalid_last_discard' };
      const count = state.players[action.actor].hand.filter((t: string) => t === action.tile).length;
      if (count < 2) return { ok: false, reason: 'insufficient_tiles' };
      return { ok: true };
    }

    if (action.type === 'GANG') {
      if (!config.allowGang) return { ok: false, reason: 'gang_disabled' };
      return { ok: true };
    }

    if (action.type === 'HU') {
      const res = this.huEvaluator.evaluate(state, action, config);
      if (!res.isWin) return { ok: false, reason: 'not_win_hand' };
      return { ok: true };
    }

    if (action.type === 'SETTLE') {
      if (state.stage !== 'ROUND_END') return { ok: false, reason: 'stage_not_round_end' };
      return { ok: true };
    }

    return { ok: true };
  }

  apply(action: Action, state: GameState, config: RoomRuleConfig): GameState {
    if (state.appliedActionIds[action.actionId]) {
      return cloneState(state);
    }

    const valid = this.validate(action, state, config);
    if (!valid.ok) {
      throw new Error(`invalid_action:${valid.reason}`);
    }

    const next = cloneState(state);
    next.version += 1;

    switch (action.type) {
      case 'READY': {
        if (!next.readySeats.includes(action.actor)) {
          next.readySeats.push(action.actor);
        }
        if (next.readySeats.length === 3) next.stage = 'DEAL';
        break;
      }
      case 'DEAL': {
        next.stage = 'PLAYING';
        break;
      }
      case 'DRAW': {
        const tile = next.wall.tiles[next.wall.nextIndex];
        next.wall.nextIndex += 1;
        next.players[action.actor].hand.push(tile);
        break;
      }
      case 'DISCARD': {
        removeFirst(next.players[action.actor].hand, action.tile);
        next.players[action.actor].discards.push(action.tile);
        next.lastDiscard = { seat: action.actor, tile: action.tile };
        next.currentTurn = nextSeat(action.actor);
        break;
      }
      case 'CHI': {
        const [a, b] = action.tiles;
        removeFirst(next.players[action.actor].hand, a);
        removeFirst(next.players[action.actor].hand, b);
        next.players[action.actor].melds.push({ type: 'CHI', tiles: [...action.tiles], fromSeat: action.fromSeat });
        next.currentTurn = action.actor;
        next.lastDiscard = undefined;
        break;
      }
      case 'PENG': {
        removeFirst(next.players[action.actor].hand, action.tile);
        removeFirst(next.players[action.actor].hand, action.tile);
        next.players[action.actor].melds.push({
          type: 'PENG',
          tiles: [action.tile, action.tile, action.tile],
          fromSeat: action.fromSeat,
        });
        next.currentTurn = action.actor;
        next.lastDiscard = undefined;
        break;
      }
      case 'GANG': {
        next.players[action.actor].melds.push({
          type: action.gangType,
          tiles: [action.tile, action.tile, action.tile, action.tile],
          fromSeat: action.fromSeat,
        });
        break;
      }
      case 'HU': {
        const huRes = this.huEvaluator.evaluate(next, action, config);
        const score = this.scoreCalculator.calculate(next, {
          winnerSeat: action.actor,
          loserSeat: action.fromSeat,
          winType: action.winType,
          fanTypes: huRes.fanSeeds ?? [],
        }, config);

        next.winnerSeat = action.actor;
        next.result = score;
        next.stage = 'ROUND_END';
        break;
      }
      case 'PASS': {
        break;
      }
      case 'SETTLE': {
        next.stage = 'ROUND_SETTLED';
        if (next.result) {
          for (const seat of [0, 1, 2] as Seat[]) {
            next.players[seat].scoreDelta += next.result.finalScoreBySeat[seat];
          }
        }
        break;
      }
      default:
        break;
    }

    const event: DomainEvent = {
      seq: next.actionLog.length + 1,
      actionId: action.actionId,
      actionType: action.type,
      actor: action.actor,
      stageAfter: next.stage,
      payload: { ...action },
      stateHash: stableHash(next),
      ts: action.ts,
    };

    next.appliedActionIds[action.actionId] = true;
    next.actionLog.push(event);
    return next;
  }

  reduce(actions: Action[], initialState: GameState, config: RoomRuleConfig): GameState {
    return actions.reduce((acc, action) => this.apply(action, acc, config), initialState);
  }

  replay(events: DomainEvent[], initialState: GameState): GameState {
    return events.reduce((acc, event) => {
      const cloned = cloneState(acc);
      cloned.actionLog.push(event);
      cloned.appliedActionIds[event.actionId] = true;
      cloned.version += 1;
      cloned.stage = event.stageAfter;
      return cloned;
    }, initialState);
  }
}
