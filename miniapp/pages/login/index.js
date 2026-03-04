import { api } from '../../services/api';
import { setToken } from '../../utils/auth';

Page({
  async onLogin() {
    wx.login({
      success: async (res) => {
        const data = await api.login(res.code);
        setToken(data.token);
        wx.reLaunch({ url: '/pages/home/index' });
      },
    });
  },
});
