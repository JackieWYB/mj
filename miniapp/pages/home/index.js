import { api } from '../../services/api';

Page({
  data: { profile: {} },
  async onShow() {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    const ext = current?.options || {};
    if (ext.resultId) {
      this.track('game_complete', { resultId: ext.resultId, roomId: ext.roomId });
      wx.navigateTo({ url: `/pages/record-detail/index?id=${ext.resultId}` });
    }

    const home = await api.home();
    this.setData({ profile: home.profile || {} });
    this.track('lobby_enter');
  },
  async onQuickStart() {
    this.track('click_quick_start');
    await api.match('quick');
    wx.navigateToMiniProgram({
      appId: '小游戏AppId',
      path: 'pages/index/index',
      extraData: { token: wx.getStorageSync('token'), source: 'miniapp_home', traceId: `${Date.now()}` },
      envVersion: 'release',
    });
  },
  async onCreateRoom() {
    const r = await api.roomCreate('default', 8);
    this.track('create_room_success', { roomId: r.roomId });
    wx.navigateToMiniProgram({
      appId: '小游戏AppId',
      path: 'pages/index/index',
      extraData: { token: wx.getStorageSync('token'), roomId: r.roomId, source: 'miniapp_create_room' },
    });
  },
  async onJoinRoom(e) {
    const roomNo = e.detail.roomNo;
    const r = await api.roomJoin(roomNo);
    wx.navigateToMiniProgram({
      appId: '小游戏AppId',
      path: 'pages/index/index',
      extraData: { token: wx.getStorageSync('token'), roomId: r.roomId, source: 'miniapp_join_room' },
    });
  },
  goClub() { wx.showToast({ title: '俱乐部待接入', icon: 'none' }); },
  goActivity() { wx.navigateTo({ url: '/pages/activity/index' }); },
  goRecords() { wx.navigateTo({ url: '/pages/records/index' }); },
  goShop() { wx.navigateTo({ url: '/pages/shop/index' }); },
  track(event, ext = {}) { console.log('[track]', event, ext); },
});
