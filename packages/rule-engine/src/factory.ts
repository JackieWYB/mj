import { GameState, RoomRuleConfig, Seat, TileCode } from './types.js';

export const defaultRuleConfig: RoomRuleConfig = {
  allowChi: true,
  allowPeng: true,
  allowGang: true,
  allowTingHint: true,
  maxFan: 8,
  baseScore: 1,
  zimoAdditive: true,
  qiduiEnabled: true,
  kaWuXingEnabled: true,
};

export const createInitialState = (input: {
  gameId: string;
  roundId: string;
  dealerSeat: Seat;
  wallTiles: TileCode[];
  initialHands?: Partial<Record<Seat, TileCode[]>>;
}): GameState => {
  const hands = input.initialHands ?? {};
  return {
    gameId: input.gameId,
    roundId: input.roundId,
    stage: 'WAIT_READY',
    dealerSeat: input.dealerSeat,
    currentTurn: input.dealerSeat,
    players: {
      0: { seat: 0, hand: [...(hands[0] ?? [])], melds: [], discards: [], scoreDelta: 0, isTing: false, isTrustee: false },
      1: { seat: 1, hand: [...(hands[1] ?? [])], melds: [], discards: [], scoreDelta: 0, isTing: false, isTrustee: false },
      2: { seat: 2, hand: [...(hands[2] ?? [])], melds: [], discards: [], scoreDelta: 0, isTing: false, isTrustee: false },
    },
    wall: { tiles: input.wallTiles, nextIndex: 0 },
    readySeats: [],
    actionLog: [],
    appliedActionIds: {},
    version: 0,
  };
};
