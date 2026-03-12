import { DeltaEvent } from '../../types/GameState';

export class EventQueue {
  private map = new Map<number, DeltaEvent>();

  enqueue(evt: DeltaEvent) {
    this.map.set(evt.seq, evt);
  }

  hasNext(expectedSeq: number): boolean {
    return this.map.has(expectedSeq);
  }

  popNext(expectedSeq: number): DeltaEvent | undefined {
    const evt = this.map.get(expectedSeq);
    if (evt) this.map.delete(expectedSeq);
    return evt;
  }

  clear() {
    this.map.clear();
  }
}
