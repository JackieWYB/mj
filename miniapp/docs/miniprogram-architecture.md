# 微信小程序外围系统方案（与小游戏对局打通）

## 1) 页面路由结构与组件拆分

## 1.1 路由
- `pages/login/index` 登录
- `pages/home/index` 首页大厅（快速开始/创建房间/加入房间/俱乐部入口）
- `pages/activity/index` 活动中心
- `pages/records/index` 战绩列表
- `pages/record-detail/index` 战绩详情（含回放入口）
- `pages/shop/index` 商城
- `pages/settings/index` 设置
- `pages/support/index` 客服/公告

## 1.2 组件
- `components/room-entry`：创建/加入房间弹层组件
- `components/loading-view`：统一 loading
- `components/empty-state`：空态（战绩、活动、商品列表）

---

## 2) API 列表与参数（REST）

> Base: `/api`

1. `POST /auth/login`
   - req: `{ code: string }`
   - resp: `{ token: string, user: {...} }`

2. `GET /home`
   - header: `Authorization: Bearer <token>`
   - resp: `{ banners, notices, profile, quickEntry }`

3. `POST /match`
   - req: `{ mode: "quick" | "rank" }`
   - resp: `{ ticketId, status }`

4. `POST /room/create`
   - req: `{ ruleId: string, rounds: number }`
   - resp: `{ roomId, roomNo }`

5. `POST /room/join`
   - req: `{ roomNo: string }`
   - resp: `{ roomId, seatHint }`

6. `GET /records/list?page=1&pageSize=20`
   - resp: `{ list, page, pageSize, total }`

7. `GET /record/detail?id=xxx`
   - resp: `{ id, players, scoreDelta, eventsBrief, replayId }`

8. `GET /replay/get?id=xxx`
   - resp: `{ replayId, snapshotUrl, eventStreamUrl }`

9. `GET /shop/items?page=1&pageSize=20`
   - resp: `{ items, total }`

10. `POST /order/create`
    - req: `{ itemId, quantity }`
    - resp: `{ orderId, payParams }`

### 通用约定
- 鉴权：Bearer Token（过期返回 `401`，前端自动重登）
- 分页：`page/pageSize/total/list`
- 错误：`{ code, message, requestId }`
- 页面态：loading/empty/error 三态统一

---

## 3) 支付接入（合规流程）

1. 小程序点击购买 -> `POST /order/create`
2. 服务端创建订单，返回 `wx.requestPayment` 所需参数
3. 小程序调用 `wx.requestPayment`
4. 微信异步回调服务端 `/pay/callback`
5. 服务端验签、更新订单状态、发货（道具/权益）
6. 小程序轮询或主动拉取订单状态 `/order/detail`

### 接口约定
- `POST /order/create`
  - req: `{ itemId: string, quantity: number }`
  - resp: `{ orderId, payParams: { timeStamp, nonceStr, package, signType, paySign } }`
- `POST /pay/callback`（微信服务器 -> 业务服务）
  - req: 微信支付回调报文
  - resp: `success/fail`
- `POST /order/deliver`
  - req: `{ orderId }`（内部）
  - resp: `{ delivered: true }`

---

## 4) 与小游戏互跳参数与 token 管理

## 4.1 小程序 -> 小游戏
- 调用 `wx.navigateToMiniProgram`
- `extraData` 建议：
```json
{
  "token": "jwt",
  "roomId": "R10001",
  "source": "miniapp_home",
  "traceId": "uuid"
}
```

## 4.2 小游戏 -> 小程序（对局结束）
- 小游戏通过 `wx.navigateBackMiniProgram` 回传：
```json
{
  "resultId": "REC_123",
  "roomId": "R10001",
  "traceId": "uuid"
}
```
- 小程序 `onShow` 读取返回参数，跳转战绩详情：
  - `pages/record-detail/index?id=REC_123`

## 4.3 token 管理
- 登录后将 token 存 `wx.setStorageSync('token', token)`
- 请求拦截器自动注入 Authorization
- 若 `401`：清 token -> 跳登录 -> 登录成功返回原页面

---

## 5) 埋点事件定义

- `lobby_enter`：进入大厅
- `click_quick_start`：点击快速开始
- `create_room_success`：创建房间成功
- `game_complete`：对局完成
- `pay_success`：支付成功

建议公共字段：
- `uid, traceId, ts, channel, appVersion, scene, roomId(optional), itemId(optional)`
