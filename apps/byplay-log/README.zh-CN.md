# ByPlay Log

[English](./README.md) | [中文](./README.zh-CN.md)

[ByPlay](https://byplay.pages.dev/) 播放器的日志采集服务——一个单端点的 Cloudflare Worker，负责校验、补充并持久化客户端播放遥测数据。基于 **Hono** 和 **Drizzle ORM** 构建。

预览：https://byplay.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png)

## Features

- **单一采集端点**（`POST /monitor?bury_content=<tag>`）——每次请求接受一批（数组形式的）播放日志事件
- **Schema 校验**——每个事件在入库前都会经过 `zod` 校验；格式错误的请求体会返回 `400` 及解析错误详情，而不是部分写入
- **请求信息补充**——服务端自动采集 `CF-Connecting-IP` / `X-Forwarded-For` / `X-Real-IP`、`User-Agent`、`CF-IPCountry`，客户端无需自行上报
- **灵活的事件结构**——`feature`、`playerConfig`、`vplayerRuntime`、`playerRuntime`、`executeProgressInfos` 均以 JSON 列存储，播放器新增运行时字段时无需变更表结构
- **CORS 限制**——仅允许 `https://byplay.pages.dev` 和 `http://localhost:3016` 两个来源
- **结构化日志**——winston 按天滚动写入；每个请求都有访问日志，数据库/校验失败时记录完整上下文
- **全局错误/404 处理**——所有失败路径统一返回 `{ code, message }` JSON 结构

## Tech Stack

- **框架** — Hono
- **数据库** — Drizzle ORM，基于 Cloudflare D1 或 LibSQL / Turso（通过 `DB_TYPE` 选择）
- **校验** — zod
- **日志** — winston + winston-daily-rotate-file
- **平台** — Cloudflare Workers

## Getting Started

### Install

```bash
pnpm install
```

### Development

```bash
# 通过 nsl 在 http://byplay-log.localhost:3355 启动开发服务器
pnpm --filter @cdlab/byplay-log dev
```

### Type-check Cloudflare bindings

```bash
pnpm --filter @cdlab/byplay-log cf-typegen
```

### Database

```bash
# 根据 schema.ts 生成迁移文件
pnpm --filter @cdlab/byplay-log db:gen

# 将迁移应用到本地 D1 数据库
pnpm --filter @cdlab/byplay-log cf:localdb

# 将迁移应用到远程 D1 数据库
pnpm --filter @cdlab/byplay-log cf:remotedb

# 打开 Drizzle Studio（3018 端口）
pnpm --filter @cdlab/byplay-log db:studio
```

复制 `.env.example` 为 `.env`，并根据所选的 `DB_TYPE` 填入数据库凭证。

### Deploy

```bash
pnpm --filter @cdlab/byplay-log deploy
```

需要绑定 Cloudflare D1 数据库 `DB`（见 `wrangler.jsonc`），若 `DB_TYPE=libsql` 则需要 `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN`。

## Architecture

- `src/index.ts` — Hono 应用入口。接入访问日志、`prettyJSON`、`requestId`、CORS（`https://byplay.pages.dev` + `http://localhost:3016`）；将 `monitorRoutes` 挂载到 `/`；全局 `onError` / `notFound` 处理器统一返回 `{ code, message, stack? }`（仅在 `isDebug` 时携带 `stack`）。
- `src/routes/monitor.ts` — 唯一的业务路由：`POST /monitor`。要求携带 `bury_content` 查询参数，使用 zod schema 解析并校验请求体（播放日志事件数组），为每条记录补充请求元数据，然后批量插入 `playerLogs` 表。
- `src/database/schema.ts` — `playerLogs` 表（自增 `id`）。核心字段（`userId`、`userIdUuid`、`streamId`、`topicId`、`time`、`version`、`ua`、`vendor`、`platform`）加上用于灵活事件结构的 JSON 列（`feature`、`playerConfig`、`vplayerRuntime`、`playerRuntime`、`executeProgressInfos`），以及请求元数据（`buryContent`、`ipAddress`、`userAgent`、`country`）。在 `userId`、`streamId`、`time`、`buryContent`、`createdAt` 以及组合索引 `(userId, streamId)` 上建立了索引。
- `src/global.ts` — 设置全局 `logger`（winston）和 `isDebug` 标志，在 `index.ts` 中以副作用方式导入。

## Configuration

| 变量 | 说明 |
|---|---|
| `DEPLOY_RUNTIME` | 部署运行时预设（`cf` 或 `node`） |
| `DB_TYPE` | 驱动选择——`libsql`（Turso）或 `d1`（Cloudflare D1） |
| `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN` | LibSQL / Turso 连接信息（`DB_TYPE=libsql` 时使用） |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | drizzle-kit 用于远程 D1 迁移 |

完整默认值参见 `.env.example` 和 `wrangler.jsonc`。

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
