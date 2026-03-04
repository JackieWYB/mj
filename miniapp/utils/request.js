import { getToken, clearToken } from './auth';

const getBase = () => getApp().globalData.apiBase;

export const request = ({ url, method = 'GET', data }) =>
  new Promise((resolve, reject) => {
    wx.request({
      url: `${getBase()}${url}`,
      method,
      data,
      header: {
        Authorization: `Bearer ${getToken()}`,
      },
      success: (res) => {
        if (res.statusCode === 401) {
          clearToken();
          wx.reLaunch({ url: '/pages/login/index' });
          return reject(new Error('unauthorized'));
        }
        if (res.statusCode >= 400) {
          return reject(new Error(res.data?.message || 'request_failed'));
        }
        resolve(res.data);
      },
      fail: reject,
    });
  });
