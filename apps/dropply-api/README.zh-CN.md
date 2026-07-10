# dropply-api

[English](./README.md) | [中文](./README.zh-CN.md)

端到端加密文件分享 API —— [`dropply-web`](../dropply-web) 的 Cloudflare Workers 后端。加密全程在浏览器内完成，本服务只存储密文和元数据，从不接触明文或密钥。基于 **Hono**、**Drizzle ORM** 与 **Cloudflare R2** 构建。

配套前端预览：https://dropply.pages.dev/

## Features

- **Session + File 模型** —— 一条 `sessions` 记录（UUID、可选 `retrievalCode`、`expiresAt`）拥有一个或多个 `files` 记录（`cascade` 级联删除）；文件以 `${sessionId}/${fileId}` 形式存储在 R2 桶中
- **两种上传路径**
  - 直接 multipart 表单上传（`POST /api/chest/:sessionId/upload`），用于较小的文件和内联文本片段
  - R2 原生分片上传（`create` → `part` → `complete`），用于大文件，由专用的 multipart JWT 保护
- **取件码** —— 完成上传后会生成 6 位 CSPRNG 取件码（`generateRetrievalCode`）及有效期（1–365 天，不设置则永久有效）
- **自研 JWT，无第三方库** —— 使用 Web Crypto 签发的 HMAC-SHA256 令牌（`lib/jwt.ts`）：短时效的 `upload`（24 小时）和 `multipart`（48 小时）令牌将每次请求限定在对应 session/file 范围内，`chest` 令牌（有效期跟随取件码过期时间）用于下载鉴权
- **可选 TOTP 校验** —— 当 `REQUIRE_TOTP=true` 时，创建 chest 需要提供有效的 6 位 TOTP 验证码，并与 `TOTP_SECRETS` 中的一个或多个密钥比对（自研 base32 + HMAC-SHA1 实现，未使用第三方 TOTP 库）
- **通过 Resend 发送邮件** —— `POST /api/email/share` 发送包含取件码与文件概览的自渲染 HTML 邮件，由 `ENABLE_EMAIL_SHARE` + `RESEND_API_KEY` 控制开关
- **全局软删除** —— `sessions` 与 `files` 共享 `trackingFields`（`createdAt`、`updatedAt`、`isDeleted`）；不做硬删除，所有查询均通过 `withNotDeleted` 过滤
- **定时清理** —— Worker 的 `scheduled()` 处理器（每小时触发一次，见 `wrangler.jsonc` 的 `triggers.crons`）运行 `cleanupExpiredContent`：清理 R2 对象，并软删除已过期的 session，以及超过 48 小时（与 multipart JWT 有效期一致）仍未完成的 session

## Tech Stack

- **框架** — Hono
- **数据库** — Drizzle ORM，基于 Cloudflare D1 或 LibSQL / Turso（通过 `DB_TYPE` 选择，经由 `@cdlab/db/node`）
- **存储** — Cloudflare R2（`R2_STORAGE` 绑定），支持原生分片上传
- **校验** — zod + `@hono/zod-validator`
- **邮件** — Resend（`resend` + `@react-email/components`）
- **日志** — winston + winston-daily-rotate-file（`DEPLOY_RUNTIME=cf` 下仅输出到控制台）
- **平台** — Cloudflare Workers

## Getting Started

### Install

```bash
pnpm install
```

### Development

```bash
# 通过 nsl 在 http://dropply-api.localhost:3355 启动开发服务器
pnpm --filter @cdlab/dropply-api dev
```

### Type-check Cloudflare bindings

```bash
pnpm --filter @cdlab/dropply-api cf-typegen
```

### Database

```bash
# 根据 schema.ts 生成迁移文件
pnpm --filter @cdlab/dropply-api db:gen

# 应用待处理的迁移（LibSQL / Turso）
pnpm --filter @cdlab/dropply-api db:migrate

# 将迁移应用到本地 D1 数据库
pnpm --filter @cdlab/dropply-api cf:localdb

# 将迁移应用到远程 D1 数据库
pnpm --filter @cdlab/dropply-api cf:remotedb

# 打开 Drizzle Studio（3015 端口）
pnpm --filter @cdlab/dropply-api db:studio
```

复制 `.env.example` 为 `.env`，并填入数据库、JWT、TOTP 与 Resend 相关配置。

### Deploy

```bash
pnpm --filter @cdlab/dropply-api deploy
```

需要绑定 `R2_STORAGE` 桶，以及与当前 `DB_TYPE` 对应的数据库 —— `DB` 绑定（D1，目前在 `wrangler.jsonc` 中处于注释状态）或 `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN`（Turso）。详见 `wrangler.jsonc`。

## Architecture

| 路由 | 文件 | 说明 |
|---|---|---|
| `POST /api/chest` | `routes/chest.ts` | 创建 session，可选 TOTP 校验；返回 `upload` JWT |
| `POST /api/chest/:sessionId/upload` | `routes/chest.ts` | 直接以 multipart 表单上传文件/文本到 R2 并写入 `files` 记录 |
| `POST /api/chest/:sessionId/complete` | `routes/chest.ts` | 校验文件归属，生成取件码与过期时间 |
| `POST /api/chest/:sessionId/multipart/create` | `routes/chest.ts` | 发起 R2 分片上传；返回 `multipart` JWT |
| `PUT /api/chest/:sessionId/multipart/:fileId/part/:partNumber` | `routes/chest.ts` | 通过 `multipart` JWT 恢复 R2 分片上传，上传单个分片 |
| `POST /api/chest/:sessionId/multipart/:fileId/complete` | `routes/chest.ts` | 完成 R2 分片上传，写入 `files` 记录 |
| `GET /api/retrieve/:retrievalCode` | `routes/retrieve.ts` | 将取件码解析为文件列表；返回 `chest` JWT |
| `GET /api/download/:fileId` | `routes/download.ts` | 通过 `chest` JWT（`Authorization: Bearer` 或 `?token=`）鉴权后从 R2 流式下载文件 |
| `GET /api/config` | `routes/config.ts` | 向前端暴露 `requireTOTP`、`emailShareEnabled`、`maxFileSize` |
| `POST /api/email/share` | `routes/email.ts` | 通过 Resend 发送取件码与文件概览邮件 |

- `src/index.ts` — Hono 应用入口。接入访问日志、`prettyJSON`、`requestId` 及开放 CORS；将全部路由组挂载在 `/api` 下；导出驱动 `cleanupExpiredContent` 的 Worker `scheduled()` 处理器。
- `src/lib/jwt.ts` — 自研的 HMAC-SHA256 JWT 签发/校验（经由 `@cdlab/uncrypto` 使用 Web Crypto），覆盖 `upload`、`multipart`、`chest` 三种令牌类型。
- `src/lib/totp.ts` — 自研 TOTP 实现（base32 + HMAC-SHA1，30 秒步长，±1 窗口）；`TOTP_SECRETS` 是 `name:secret,name2:secret2` 形式的列表，`verifyAnyTOTP` 匹配任一已配置密钥即通过。
- `src/lib/db.ts` — 对 `@cdlab/db/node` 的 `defineDb` 的薄封装；`useDrizzle(c)` 根据应用的 `DB_TYPE` 从 `c.env` 构建驱动。
- `src/cron/cleanup.ts` — `cleanupExpiredContent(env)`，由 `scheduled()` 调用；先删除 R2 对象，再对已过期以及长期未完成的 session 及其 `files` 执行软删除。
- `src/global.ts` — 设置全局 `logger`（winston）和 `isDebug` 标志，在 `index.ts` 中以副作用方式导入。

### 响应结构

业务路由返回 `ApiResponse<T>` —— `{ code: number, message: string, data?: T }`（`code: 0` 表示成功）。未捕获的错误与未匹配的路由由 `src/index.ts` 中的全局 `onError` / `notFound` 处理器接管，统一返回 `{ statusCode, message, stack? }`（仅在 `isDebug` 为真时携带 `stack`）。

## Configuration

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DEPLOY_RUNTIME` | `cf` | 运行时预设（`cf` 仅输出控制台日志） |
| `DB_TYPE` | `libsql` | 驱动选择 —— `libsql`（Turso）或 `d1`（Cloudflare D1） |
| `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN` | — | LibSQL / Turso 连接信息（`DB_TYPE=libsql` 时使用） |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | — | drizzle-kit 的 `d1-http` 驱动用于远程迁移 |
| `MAX_FILE_SIZE_MB` | `100` | `GET /api/config` 返回的最大文件大小 |
| `REQUIRE_TOTP` | `false` | 创建 chest session 是否需要 TOTP 校验 |
| `TOTP_SECRETS` | — | `name:secret,name2:secret2` 形式的 base32 TOTP 密钥列表 |
| `JWT_SECRET` | — | `upload` / `multipart` / `chest` JWT 的 HMAC 密钥 |
| `ENABLE_EMAIL_SHARE` | `false` | 是否启用 `POST /api/email/share` |
| `RESEND_API_KEY` | — | Resend API 密钥 |
| `RESEND_FROM_EMAIL` | `noreply@resend.dev` | 分享邮件的发件地址 |
| `RESEND_WEB_URL` | — | 用于在邮件中生成取件链接的公开 `dropply-web` 地址 |

完整默认值参见 `.env.example` 与 `wrangler.jsonc`。R2 桶绑定为 `R2_STORAGE`（桶名 `dropply`）；D1 绑定为 `DB`（数据库名 `dropply`，目前处于注释状态）。

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
