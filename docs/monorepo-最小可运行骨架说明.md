# Monorepo 最小可运行骨架说明

## 1) 目录结构

```text
.
├─ .env.example
├─ package.json
├─ packages/
│  ├─ server/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ main.ts
│  │     ├─ app.module.ts
│  │     ├─ auth/
│  │     ├─ room/
│  │     └─ gateway/
│  ├─ miniprogram/
│  │  ├─ app.json
│  │  ├─ app.js
│  │  ├─ pages/index/*
│  │  ├─ utils/request.js
│  │  └─ mock/api.js
│  └─ game/
│     └─ assets/scripts/
│        ├─ Bootstrap.ts
│        ├─ core/{NetClient,GameClient}.ts
│        └─ ui/UILogPanel.ts
└─ docs/monorepo-最小可运行骨架说明.md
```

## 2) 关键能力说明
- `packages/server`：NestJS + ws，可启动 HTTP + WS；提供 `POST /auth/login/mock`、`POST /room/create`、`POST /room/join`；WS 支持 `AUTH/JOIN_ROOM/READY/END_GAME/PING`；房间状态机最小流转 `READY -> DEAL -> PLAYING -> END`。
- `packages/miniprogram`：微信小程序大厅 mock 页面，可本地运行，不依赖云服务。
- `packages/game`：Cocos TS 脚本骨架，可连接 WS 并输出简单 UI 日志。

## 3) 本地启动步骤（不依赖云服务）

### 3.1 准备
1. 复制环境变量：
   - `cp .env.example .env`
2. 安装依赖：
   - 在仓库根目录执行 `npm install`（workspace 模式）

### 3.2 启动 server
- 开发模式：
  - `npm run server:dev`
- 生产模式：
  - `npm run server:build`
  - `npm run server:start`

### 3.3 体验 miniprogram
- 用微信开发者工具打开 `packages/miniprogram`
- 点击“登录(mock)” -> “创建房间”

### 3.4 体验 game（Cocos）
- 将 `packages/game/assets/scripts` 拷贝到 Cocos 工程
- 运行时设置：
  - `GAME_WS_URL=ws://localhost:3000/ws`
  - `GAME_TOKEN=mock-Uxxxx`
  - `GAME_ROOM_ID=Rxxxx`（可选）
- 调用 `bootstrapDemo()` 可看到连接与消息日志

## 4) .env.example 字段说明
- `NODE_ENV`：运行环境（development/production）
- `SERVER_PORT`：服务端监听端口
- `SERVER_WS_PATH`：WebSocket 路径（默认 `/ws`）
- `JWT_SECRET`：鉴权密钥（当前 mock，后续 JWT 使用）
- `ROOM_MAX_PLAYERS`：房间最大人数
- `LOG_LEVEL`：日志等级
- `MINIPROGRAM_API_BASE`：小程序 API 地址
- `MINIPROGRAM_GAME_APPID`：小游戏 appid（演示可填占位）
- `GAME_WS_URL`：Cocos 客户端 WS 地址
- `GAME_HTTP_BASE`：Cocos 客户端 HTTP 基础地址
- `GAME_DEFAULT_ROOM_ID`：默认测试房间ID
- `GAME_UID_PREFIX`：测试 UID 前缀

