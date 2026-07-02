# LiveUser

[English](./README.md) | [中文](./README.zh-CN.md)

任意网站的实时在线用户计数器——嵌入一行 `<script>` 标签即可使用，无需服务端配置，无需账号。基于 **Hono + Cloudflare Workers + Durable Objects**（WebSocket Hibernation API + 内嵌 SQLite）构建。

预览：https://live-user.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/live-user/index.png)

## 功能特性

- **一行嵌入** —— 一个 `<script>` 标签即可将实时在线人数渲染到任意元素；加上 `enableTotalCount=true` 还能同时显示累计访问总数
- **WebSocket Hibernation API** —— 每个 `siteId` 通过 `ctx.acceptWebSocket()` 对应各自的 `SiteManager` Durable Object；连接空闲时自动休眠，空闲站点的成本趋近于零
- **DO 内嵌 SQLite** —— 总访问量持久化在 DO 自带的 `visit_counter` 表中，通过 `INSERT ... ON CONFLICT ... DO UPDATE` 原子更新
- **零依赖 SDK** —— `/liveuser.js` 以单个内联 IIFE 形式提供（无外部依赖），内置自动重连、心跳检测与调试日志
- **多站点** —— 单次 worker 部署即可服务无限个站点，各站点通过 `siteId` 相互隔离

## 技术栈

- **框架** —— Hono
- **平台** —— Cloudflare Workers
- **状态** —— Durable Objects（WebSocket Hibernation API）
- **存储** —— 内嵌于 Durable Object 的 SQLite（`new_sqlite_classes`）
- **页面** —— Hono JSX（`hono/jsx`）渲染演示页

## 快速开始

### 前置条件

- Node.js + pnpm（monorepo 根目录）
- 一个 Cloudflare 账号（用于 `wrangler deploy`）

### 安装

在 monorepo 根目录下：

```bash
pnpm install
```

### 本地开发

```bash
pnpm --filter @cdlab996/live-user dev
```

开发服务器地址为 `http://live-user.localhost:3355`（通过 `@dotns/nsl` 提供，无需手动查找端口）。

修改 `wrangler.jsonc` 后重新生成 Cloudflare 绑定类型：

```bash
pnpm --filter @cdlab996/live-user cf-typegen
```

### 构建 / 部署

```bash
pnpm --filter @cdlab996/live-user deploy
```

执行 `wrangler deploy --minify`。需要在 `wrangler.jsonc` 中配置好 `SITE_MANAGER` Durable Object 绑定和 `account_id`。

## 使用方式

```html
<div id="liveuser">0</div>
<script src="https://live-user.cdlab.workers.dev/liveuser.js"></script>
```

同时显示总访问量：

```html
<div>Online: <span id="liveuser">0</span></div>
<div>Total: <span id="liveuser_totalvisits">0</span></div>
<script src="https://live-user.cdlab.workers.dev/liveuser.js?enableTotalCount=true"></script>
```

### SDK 参数

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `siteId` | 站点标识 | `default-site` |
| `displayElementId` | 在线人数显示元素 ID | `liveuser` |
| `totalCountElementId` | 总访问量显示元素 ID | `liveuser_totalvisits` |
| `enableTotalCount` | 启用总访问量统计 | `false` |
| `reconnectDelay` | 重连延迟（毫秒） | `3000` |
| `debug` | 启用控制台日志 | `false` |
| `serverUrl` | WebSocket 服务器地址 | 自动检测 |

## 架构说明

| 路径 | 作用 |
| --- | --- |
| `src/index.ts` | 入口——Hono 应用、全局中间件（`logger`、`requestId`）、路由注册、404 处理 |
| `src/site-manager.ts` | `SiteManager` Durable Object——接收可休眠的 WebSocket 连接，通过 `ctx.getWebSockets()` 计算在线人数，并将总访问量持久化到内嵌的 `visit_counter` SQLite 表 |
| `src/routes/home.tsx` | `GET /` —— 渲染演示页 |
| `src/routes/sdk.ts` | `GET /liveuser.js` —— 根据查询参数配置生成并返回可嵌入的 SDK 脚本 |
| `src/routes/ws.ts` | `GET /ws` —— 根据 `siteId` 解析对应的 `SiteManager` DO 实例并转发 WebSocket 升级请求 |
| `src/pages/Layout.tsx` / `src/pages/HomePage.tsx` | Hono JSX 页面外壳与演示页内容 |
| `src/types/index.ts` | 共享类型：`AppEnv`、`ConnectionState`、`SDKConfig` |

每个 `siteId` 对应一个 `SiteManager` Durable Object 实例。连接状态（`clientId`、`siteId`、`enableTotalCount`、`joinedAt`）通过 `serializeAttachment`/`deserializeAttachment` 存储在 socket 本身上，因此 DO 可以在事件之间休眠，唤醒后仍能识别每个连接所属的站点及其偏好设置。加入/关闭/出错时的广播都会重新计算在线人数，并且只为选择了 `enableTotalCount` 的连接附带 `totalCount`。

> Hibernation API 会在 socket 已经关闭**之后**才调用 `webSocketClose`——因此 `src/site-manager.ts` 从不在该回调中调用 `ws.close()`，否则会抛出异常。

## 许可证

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
