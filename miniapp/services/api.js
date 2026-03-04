import { request } from '../utils/request';

export const api = {
  login: (code) => request({ url: '/auth/login', method: 'POST', data: { code } }),
  home: () => request({ url: '/home' }),
  match: (mode) => request({ url: '/match', method: 'POST', data: { mode } }),
  roomCreate: (ruleId, rounds) => request({ url: '/room/create', method: 'POST', data: { ruleId, rounds } }),
  roomJoin: (roomNo) => request({ url: '/room/join', method: 'POST', data: { roomNo } }),
  records: (page, pageSize) => request({ url: `/records/list?page=${page}&pageSize=${pageSize}` }),
  recordDetail: (id) => request({ url: `/record/detail?id=${id}` }),
  replayGet: (id) => request({ url: `/replay/get?id=${id}` }),
  shopItems: (page, pageSize) => request({ url: `/shop/items?page=${page}&pageSize=${pageSize}` }),
  orderCreate: (itemId, quantity) => request({ url: '/order/create', method: 'POST', data: { itemId, quantity } }),
};
