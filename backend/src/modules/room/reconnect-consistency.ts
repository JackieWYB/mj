export interface RoomEvent {
  eventSeq: number;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface Snapshot {
  snapshotSeq: number;
  state: Record<string, unknown>;
}

export interface ConnectionState {
  connId: string;
  uid: string;
  sendSeq: number;
  lastAckEventSeq: number;
}

export class RingBuffer<T> {
  constructor(private readonly max: number, private items: T[] = []) {}

  push(item: T) {
    this.items.push(item);
    if (this.items.length > this.max) this.items.shift();
  }

  range(filter: (v: T) => boolean): T[] {
    return this.items.filter(filter);
  }
}

export class ActionDedupStore {
  private readonly store = new Map<string, number>();

  has(key: string, now = Date.now()): boolean {
    const exp = this.store.get(key);
    if (!exp) return false;
    if (exp < now) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  set(key: string, ttlMs: number, now = Date.now()) {
    this.store.set(key, now + ttlMs);
  }
}

export class ReconnectConsistencyManager {
  roomEventSeq = 0;
  readonly eventBuffer = new RingBuffer<RoomEvent>(200);
  readonly dedup = new ActionDedupStore();

  publish(eventType: string, payload: Record<string, unknown>): RoomEvent {
    this.roomEventSeq += 1;
    const evt: RoomEvent = { eventSeq: this.roomEventSeq, eventType, payload };
    this.eventBuffer.push(evt);
    return evt;
  }

  markAction(uid: string, actionId: string, ttlMs = 120_000): { duplicate: boolean } {
    const key = `${uid}:${actionId}`;
    if (this.dedup.has(key)) return { duplicate: true };
    this.dedup.set(key, ttlMs);
    return { duplicate: false };
  }

  buildSnapshot(state: Record<string, unknown>): Snapshot {
    return { snapshotSeq: this.roomEventSeq, state };
  }

  getDeltaAfter(snapshotSeq: number): RoomEvent[] {
    return this.eventBuffer.range((e) => e.eventSeq > snapshotSeq);
  }

  checkClientEventSeq(lastEventSeq: number, incomingEventSeq: number): 'DUPLICATE' | 'CONTIGUOUS' | 'GAP' {
    if (incomingEventSeq <= lastEventSeq) return 'DUPLICATE';
    if (incomingEventSeq === lastEventSeq + 1) return 'CONTIGUOUS';
    return 'GAP';
  }
}
