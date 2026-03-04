import { api } from '../../services/api';

Page({
  data: { loading: false, page: 1, pageSize: 20, list: [] },
  async onShow() {
    this.setData({ loading: true });
    const data = await api.records(this.data.page, this.data.pageSize);
    this.setData({ list: data.list || [], loading: false });
  },
  goDetail(e) {
    wx.navigateTo({ url: `/pages/record-detail/index?id=${e.currentTarget.dataset.id}` });
  },
});
