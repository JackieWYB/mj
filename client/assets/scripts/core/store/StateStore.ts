import { DeltaEvent, GameState, SnapshotState } from '../../types/GameState';

export class StateStore {
  private _state: GameState;

  constructor() {
    this._state = {
      rid: '',
      stage: 'WAIT_READY',
      roundId: '',
      dealerUid: '',
      turnUid: '',
      wallLeft: 0,
      players: [],
      lastEventSeq: 0,
      rule: {},
      expectedSeq: 1,
      lastAckSeq: 0,
      reconnecting: false,
    };
  }

  get state(): GameState {
    return this._state;
  }

  rebuildFromSnapshot(snapshot: SnapshotState) {
    this._state = {
      ...snapshot,
      expectedSeq: snapshot.lastEventSeq + 1,
      lastAckSeq: snapshot.lastEventSeq,
      reconnecting: false,
    };
  }

  applyDelta(evt: DeltaEvent) {
    // 这里为示意：真实项目中建议 JSON-Patch 库或显式 reducer
    if (evt.patch.turnUid) this._state.turnUid = String(evt.patch.turnUid);
    if (evt.patch.wallLeft) this._state.wallLeft = Number(evt.patch.wallLeft);
    this._state.lastEventSeq = evt.seq;
  }

  setReconnecting(v: boolean) {
    this._state.reconnecting = v;
  }

  setExpectedSeq(seq: number) {
    this._state.expectedSeq = seq;
  }

  setLastAckSeq(seq: number) {
    this._state.lastAckSeq = seq;
  }

  canOperate(action: 'DISCARD' | 'DRAW' | 'PENG' | 'GANG' | 'HU' | 'PASS'): boolean {
    return this._state.stage === 'PLAYING' && !!action;
  }
}
