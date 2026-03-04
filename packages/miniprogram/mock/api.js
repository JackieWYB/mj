module.exports = {
  async loginMock() {
    return { uid: `U${Date.now()}`, token: `mock-U${Date.now()}` };
  },
  async homeMock() {
    return { title: '卡五星大厅', notices: ['欢迎体验本地骨架'] };
  },
};
