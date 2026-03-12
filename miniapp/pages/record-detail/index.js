import { api } from '../../services/api';

Page({
  data: { detail: {} },
  async onLoad(query) {
    const data = await api.recordDetail(query.id);
    this.setData({ detail: { ...data, scoreText: JSON.stringify(data.scoreDelta || {}) } });
  },
  async onReplay() {
    const data = await api.replayGet(this.data.detail.replayId || this.data.detail.id);
    wx.navigateToMiniProgram({
      appId: '小游戏AppId',
      path: 'pages/replay/index',
      extraData: {
        token: wx.getStorageSync('token'),
        replayId: data.replayId,
        source: 'miniapp_record_detail',
      },
    });
  },
});
