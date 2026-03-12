export class BundleManager {
  async preloadTable() { /* bundle-table */ }
  async preloadTile() { /* bundle-tile */ }
  async preloadFx() { /* bundle-fx */ }
  async preloadAudio() { /* bundle-audio */ }

  // 预留热更新入口
  async checkHotUpdate(manifestUrl: string) {
    void manifestUrl;
    return { hasUpdate: false, version: '1.0.0' };
  }
}
