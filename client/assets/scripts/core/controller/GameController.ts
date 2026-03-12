import { NetClient } from '../net/NetClient';
import { StateStore } from '../store/StateStore';
import { EventQueue } from '../event/EventQueue';
import { TableView } from '../../view/table/TableView';
import { AnimPlayer } from '../../anim/AnimPlayer';
import { AudioMgr } from '../../audio/AudioMgr';
import { UIRouter } from '../../router/UIRouter';

const uuid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export class GameController {
  private readonly store = new StateStore();
  private readonly queue = new EventQueue();
  private readonly net: NetClient;

  constructor(
    wsUrl: string,
    uid: string,
    private readonly tableView: TableView,
    private readonly animPlayer: AnimPlayer,
    private readonly audioMgr: AudioMgr,
    private readonly uiRouter: UIRouter,
  ) {
    this.net = new NetClient(wsUrl, uid, {
      onOpen: () => this.store.setReconnecting(false),
      onClose: () => this.store.setReconnecting(true),
      onSnapshot: (snapshot) => this.onSnapshot(snapshot),
      onDeltaEvent: (evt, seq) => this.onDelta(evt, seq),
      onError: (err) => console.warn('[NetError]', err),
    });
  }

  start() {
    this.net.connect();
    this.uiRouter.open('ROOM');
  }

  onClickReady(rid: string) {
    this.net.sendAction(rid, { actionId: uuid(), action: 'READY', data: {} });
  }

  onClickDiscard(rid: string, tile: string) {
    if (!this.store.canOperate('DISCARD')) return;
    this.net.sendAction(rid, {
      actionId: uuid(),
      action: 'DISCARD',
      data: { tile },
    });
  }

  private onSnapshot(snapshot: any) {
    this.store.rebuildFromSnapshot(snapshot);
    this.tableView.rebuild(snapshot);
    this.queue.clear();
  }

  private async onDelta(evt: any, seq: number) {
    this.queue.enqueue({ seq, eventType: evt.eventType, patch: evt.patch ?? {} });
    await this.drainQueue();
  }

  private async drainQueue() {
    const expected = () => this.store.state.expectedSeq;
    while (this.queue.hasNext(expected())) {
      const evt = this.queue.popNext(expected());
      if (!evt) break;

      this.store.applyDelta(evt);
      await this.animPlayer.playByEvent({ eventType: evt.eventType });
      this.tableView.render(this.store.state);
      this.audioMgr.onEvent(evt.eventType, this.store.state.turnUid);

      this.net.sendAck(this.store.state.rid, evt.seq);
      this.store.setExpectedSeq(evt.seq + 1);
      this.store.setLastAckSeq(evt.seq);
    }

    // seq断档：请求 snapshot / 重发
    if (!this.queue.hasNext(expected()) && this.store.state.lastEventSeq + 1 < expected()) {
      this.net.requestSnapshot(this.store.state.rid);
    }
  }
}
