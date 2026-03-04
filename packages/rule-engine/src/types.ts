export type Suit = 'WAN' | 'TIAO' | 'TONG' | 'ZI';

export interface Tile {
  suit: Suit;
  rank: number;
}

export type TileCode = `${Suit}_${number}`;

export type Seat = 0 | 1 | 2;

export type Stage =
  | 'WAIT_READY'
  | 'DEAL'
  | 'PLAYING'
  | 'ROUND_END'
  | 'ROUND_SETTLED';

export interface RoomRuleConfig {
  allowChi: boolean;
  allowPeng: boolean;
  allowGang: boolean;
  allowTingHint: boolean;
  maxFan: number;
  baseScore: number;
  zimoAdditive: boolean;
  qiduiEnabled: boolean;
  kaWuXingEnabled: boolean;
}

export interface PlayerState {
  seat: Seat;
  hand: TileCode[];
  melds: Meld[];
  discards: TileCode[];
  tingCandidates?: TileCode[];
  scoreDelta: number;
  isTing: boolean;
  isTrustee: boolean;
}

export interface Meld {
  type: 'CHI' | 'PENG' | 'MING_GANG' | 'AN_GANG' | 'BU_GANG';
  tiles: TileCode[];
  fromSeat?: Seat;
}

export interface WallState {
  tiles: TileCode[];
  nextIndex: number;
}

export interface RoundResult {
  winnerSeat?: Seat;
  winType?: 'ZIMO' | 'DIANPAO';
  loserSeat?: Seat;
  fanBreakdown: FanResult[];
  finalScoreBySeat: Record<Seat, number>;
}

export interface FanResult {
  fanType: string;
  fanValue: number;
}

export interface ActionMeta {
  actionId: string;
  actor: Seat;
  ts: number;
}

export type Action =
  | ({ type: 'READY' } & ActionMeta)
  | ({ type: 'DEAL' } & ActionMeta)
  | ({ type: 'DRAW' } & ActionMeta)
  | ({ type: 'DISCARD'; tile: TileCode } & ActionMeta)
  | ({ type: 'CHI'; tiles: [TileCode, TileCode, TileCode]; fromSeat: Seat } & ActionMeta)
  | ({ type: 'PENG'; tile: TileCode; fromSeat: Seat } & ActionMeta)
  | ({ type: 'GANG'; tile: TileCode; gangType: 'AN_GANG' | 'MING_GANG' | 'BU_GANG'; fromSeat?: Seat } & ActionMeta)
  | ({ type: 'HU'; winTile: TileCode; winType: 'ZIMO' | 'DIANPAO'; fromSeat?: Seat } & ActionMeta)
  | ({ type: 'PASS' } & ActionMeta)
  | ({ type: 'SETTLE' } & ActionMeta);

export interface DomainEvent {
  seq: number;
  actionId: string;
  actionType: Action['type'];
  actor: Seat;
  stageAfter: Stage;
  payload: Record<string, unknown>;
  stateHash: string;
  ts: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export interface GameState {
  gameId: string;
  roundId: string;
  stage: Stage;
  dealerSeat: Seat;
  currentTurn: Seat;
  players: Record<Seat, PlayerState>;
  wall: WallState;
  lastDiscard?: { seat: Seat; tile: TileCode };
  readySeats: Seat[];
  winnerSeat?: Seat;
  result?: RoundResult;
  actionLog: DomainEvent[];
  appliedActionIds: Record<string, true>;
  version: number;
}

export interface WinContext {
  actor: Seat;
  winTile: TileCode;
  winType: 'ZIMO' | 'DIANPAO';
  fromSeat?: Seat;
}

export interface WinResult {
  isWin: boolean;
  huType?: string;
  fanSeeds?: string[];
}

export interface IHuEvaluator {
  evaluate(state: GameState, ctx: WinContext, config: RoomRuleConfig): WinResult;
}

export interface IHandPatternDetector {
  detect(state: GameState, seat: Seat, config: RoomRuleConfig): string[];
}

export interface ScoreContext {
  winnerSeat: Seat;
  winType: 'ZIMO' | 'DIANPAO';
  loserSeat?: Seat;
  fanTypes: string[];
}

export interface IScoreCalculator {
  calculate(state: GameState, ctx: ScoreContext, config: RoomRuleConfig): RoundResult;
}

export interface IMahjongRuleEngine {
  validate(action: Action, state: GameState, config: RoomRuleConfig): ValidationResult;
  apply(action: Action, state: GameState, config: RoomRuleConfig): GameState;
  reduce(actions: Action[], initialState: GameState, config: RoomRuleConfig): GameState;
  replay(events: DomainEvent[], initialState: GameState): GameState;
}
