const req = require('../../utils/request');

Page({
  data: { title: '加载中', token: '', roomId: '' },
  async onLoad() {
    const home = await req.homeMock();
    this.setData({ title: home.title });
  },
  async onLogin() {
    const user = await req.loginMock();
    getApp().globalData.token = user.token;
    this.setData({ token: user.token });
  },
  onCreateRoom() {
    const roomId = `R${Date.now()}`;
    this.setData({ roomId });
    getApp().globalData.roomId = roomId;
    wx.showToast({ title: `房间:${roomId}`, icon: 'none' });
  },
  onJoinRoom() {
    wx.showToast({ title: '演示版: 输入房号流程可扩展', icon: 'none' });
  },
});
