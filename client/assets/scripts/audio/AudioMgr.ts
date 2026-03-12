export class AudioMgr {
  playBgm(name: string) {
    void name;
    // TODO: bundle-audio 加载 + 循环播放
  }

  stopBgm() {}

  playSfx(name: string) {
    void name;
    // TODO: 操作音
  }

  playDialectVoice(eventType: string, uid: string) {
    void eventType;
    void uid;
    // TODO: 方言语音映射接口预留（可接 CDN 资源）
  }

  onEvent(eventType: string, uid: string) {
    if (eventType === 'CARD_DISCARDED') this.playSfx('discard');
    if (eventType === 'HU_DONE') this.playDialectVoice('HU_DONE', uid);
  }
}
