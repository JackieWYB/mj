import { GameState, SnapshotState } from '../../types/GameState';
import { HandView } from '../seat/HandView';
import { DiscardView } from '../seat/DiscardView';
import { MeldView } from '../seat/MeldView';

export class TableView {
  constructor(
    private readonly handView: HandView,
    private readonly discardView: DiscardView,
    private readonly meldView: MeldView,
  ) {}

  rebuild(snapshot: SnapshotState) {
    this.render(snapshot as GameState);
  }

  render(state: GameState) {
    for (const p of state.players) {
      this.handView.render(p.seat, p.hand);
      this.discardView.render(p.seat, p.discards);
      this.meldView.render(p.seat, p.melds);
    }
    // TODO: render turn indicator, wallLeft, countdown
  }
}
