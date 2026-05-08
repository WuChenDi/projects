# LiveUser

[English](./README.md) | [中文](./README.zh-CN.md)

任意网站的实时在线用户计数器。嵌入一行 script 标签，即可显示当前在线人数。

基于 [Hono](https://hono.dev/) + Cloudflare Workers + Durable Objects（WebSocket Hibernation API + SQLite）构建。

预览：https://live-user.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/live-user/index.png)

## 使用方式

```html
<div id="liveuser">0</div>
<script src="https://live-user.cdlab.workers.dev/liveuser.js"></script>
```

同时显示总访问量：

```html
<div>在线: <span id="liveuser">0</span></div>
<div>总访问: <span id="liveuser_totalvisits">0</span></div>
<script src="https://live-user.cdlab.workers.dev/liveuser.js?enableTotalCount=true"></script>
```

## 参数说明

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `siteId` | 站点标识 | `default-site` |
| `displayElementId` | 在线人数显示元素 ID | `liveuser` |
| `totalCountElementId` | 总访问量显示元素 ID | `liveuser_totalvisits` |
| `enableTotalCount` | 启用总访问量统计 | `false` |
| `reconnectDelay` | 重连延迟（毫秒） | `3000` |
| `debug` | 启用控制台日志 | `false` |
| `serverUrl` | WebSocket 服务器地址 | 自动检测 |

## 本地开发

```bash
pnpm dev:live-user
```

## 部署

```bash
pnpm deploy:live-user
```

## 项目结构

```
src/
  index.ts              # 入口，中间件与路由注册
  site-manager.ts       # Durable Object（Hibernation API + SQLite）
  types/index.ts        # 共享类型定义
  routes/
    index.ts            # 统一导出
    home.tsx            # GET /
    sdk.ts              # GET /liveuser.js
    ws.ts               # GET /ws
  pages/
    Layout.tsx          # HTML 外壳
    HomePage.tsx        # 演示页面
```

## 工作原理

- 每个 `siteId` 对应一个 Durable Object 实例
- WebSocket 连接通过 [Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) 管理，DO 空闲时自动休眠以节省成本
- 总访问量存储在 DO 内嵌的 SQLite 中，使用 `INSERT ... ON CONFLICT` 原子更新，不会丢失计数
- JS SDK 以单个 IIFE 形式从 `/liveuser.js` 直接输出，无需额外加载

## 许可证

[MIT](./LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
