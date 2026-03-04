import { api } from '../../services/api';

Page({
  data: { items: [] },
  async onShow() {
    const data = await api.shopItems(1, 20);
    this.setData({ items: data.items || [] });
  },
  async buy(e) {
    const itemId = e.currentTarget.dataset.id;
    const order = await api.orderCreate(itemId, 1);
    wx.requestPayment({
      ...order.payParams,
      success: () => {
        this.track('pay_success', { itemId, orderId: order.orderId });
        wx.showToast({ title: '支付成功' });
      },
      fail: () => wx.showToast({ title: '支付取消/失败', icon: 'none' }),
    });
  },
  track(event, ext = {}) { console.log('[track]', event, ext); },
});
