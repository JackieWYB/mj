export class AnimPlayer {
  private speed = 1;
  private interrupted = false;

  setSpeed(multiplier: number) {
    this.speed = Math.max(0.25, Math.min(4, multiplier));
  }

  interrupt() {
    this.interrupted = true;
  }

  async playByEvent(evt: { eventType: string }) {
    this.interrupted = false;
    switch (evt.eventType) {
      case 'CARD_DEALT':
        return this.playDeal();
      case 'CARD_DRAWN':
        return this.playDraw();
      case 'CARD_DISCARDED':
        return this.playDiscard();
      case 'MELD_DONE':
        return this.playMeld();
      case 'HU_DONE':
        return this.playHu();
      case 'ROUND_END':
        return this.playSettlement();
      default:
        return;
    }
  }

  private async playDeal() { await this.wait(280 / this.speed); }
  private async playDraw() { await this.wait(120 / this.speed); }
  private async playDiscard() { await this.wait(140 / this.speed); }
  private async playMeld() { await this.wait(220 / this.speed); }
  private async playHu() { await this.wait(360 / this.speed); }
  private async playSettlement() { await this.wait(400 / this.speed); }

  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), ms);
      if (this.interrupted) {
        clearTimeout(timer);
        resolve();
      }
    });
  }
}
