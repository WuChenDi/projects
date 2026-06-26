# Flnk

[English](./README.md) | [中文](./README.zh-CN.md)

隐私优先的短链接服务，支持地域 / 设备路由与边缘分析 —— 跳转路径上无追踪、无 Cookie。基于 **Next.js（App Router）+ Drizzle** 构建，通过 [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) 部署到 **Cloudflare Workers**。

预览：https://flnk.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flnk/index.png)

## 功能特性

- **边缘跳转引擎**（`app/[slug]/route.ts`）
  - KV 缓存 → D1 兜底 → 回填缓存，热点链接在边缘直接命中
  - 状态码可配置（默认 `308`），支持按链接过期清理
  - 可选大小写不敏感 slug（`CASE_SENSITIVE`）

- **智能路由**
  - **地域路由**（基于 `cf.country`）—— 不同地区跳转到不同目标
  - **设备路由** —— 为 Apple / Android UA 设置专属目标
  - **查询参数透传**（`REDIRECT_WITH_QUERY`，支持按链接覆盖）

- **链接保护**
  - **密码门** —— HTML 表单，由 Argon2id + 每链接独立 salt 校验
  - 针对风险目标的**不安全跳转中间页**；非 `http(s)` 协议渲染为 `about:blank`
  - **社交爬虫 OG HTML**（`app/[slug]/og/route.ts`）+ 链接伪装（cloaking）

- **分析与隐私**
  - 经 `ctx.waitUntil` 写入 **Cloudflare Analytics Engine** —— 爬虫检测、UA 解析、地域维度
  - 跳转路径零追踪 Cookie；日志可开关（`DISABLE_BOT_ACCESS_LOG`）

- **管理后台**
  - 管理链接、查看单链接点击统计、导出 / 导入 / 备份
  - 基于 Cloudflare Workers AI 的 **AI slug 生成**
  - 通过 `(slug, domain)` 复合唯一键支持**多域名**

- **鉴权** —— 社交登录（better-auth：Google + GitHub，登录即注册），通过会话 Cookie 守护后台及全部 `/api/*` 路由

- **国际化** —— 中英文（`next-intl`），语言基于 Cookie 存储，因此不会与顶层 `[slug]` 路由冲突

- **定时清理** —— 由 worker 的 `scheduled()` 处理器软删除过期链接并清除 KV

## 技术栈

- **框架** —— Next.js（App Router）、React、TypeScript
- **数据库** —— Drizzle ORM，运行于 Cloudflare D1 或 LibSQL / Turso（运行时可切换）
- **鉴权** —— better-auth（Google + GitHub OAuth）
- **平台** —— Cloudflare Workers（KV、D1、Workers AI、Analytics Engine），经 OpenNext 部署
- **国际化** —— next-intl（en / zh）

## 快速开始

```bash
# 安装依赖（在 monorepo 根目录）
pnpm install

# 启动开发服务器，访问 http://flnk.localhost:3355（通过 nsl）
pnpm --filter @cdlab996/flnk dev

# 对 Cloudflare 绑定做类型检查
pnpm --filter @cdlab996/flnk cf-typegen

# 从 schema.ts 生成迁移，然后打开 Drizzle Studio（端口 3021）
pnpm --filter @cdlab996/flnk db:gen
pnpm --filter @cdlab996/flnk db:studio
```

将 `.env.example` 复制为 `.env`，填入 better-auth + OAuth 密钥以及数据库凭据。

## 环境变量

### 鉴权

| 变量 | 默认值 | 说明 |
|---|---|---|
| `BETTER_AUTH_URL` | `http://flnk.localhost:3355` | better-auth 签发 Cookie / 跳转所基于的公开访问源 |
| `BETTER_AUTH_SECRET` | — | 足够长的随机字符串（`openssl rand -base64 32`） |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Google OAuth 凭据 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | GitHub OAuth 凭据 |

### 数据库

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DB_TYPE` | `libsql` | 驱动选择 —— `libsql`（Turso）或 `d1`（Cloudflare D1） |
| `LIBSQL_URL` | `file:./src/database/data.db` | LibSQL URL；可用本地 SQLite 文件离线开发 |
| `LIBSQL_AUTH_TOKEN` | — | LibSQL / Turso 鉴权令牌（部署时用 `wrangler secret put` 设置） |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_DATABASE_ID` | — | drizzle-kit 的 `d1-http` 驱动用于远程迁移 |

### 跳转引擎

| 变量 | 默认值 | 说明 |
|---|---|---|
| `REDIRECT_STATUS_CODE` | `308` | 跳转使用的 HTTP 状态码 |
| `LINK_CACHE_TTL` | `60` | KV 缓存 TTL（秒） |
| `REDIRECT_WITH_QUERY` | `false` | 将入站查询字符串透传到目标 |
| `HOME_URL` | — | 若设置，`/` 跳转到此处而非渲染落地页 |
| `NOT_FOUND_REDIRECT` | — | 未知 slug 的兜底跳转 URL |
| `CASE_SENSITIVE` | `false` | slug 是否大小写敏感 |
| `SLUG_DEFAULT_LENGTH` | `6` | 自动生成 slug 的长度 |
| `LIST_QUERY_LIMIT` | `500` | 列表查询返回的链接上限 |

### 分析

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DATASET` | `flnk_analytics` | Analytics Engine 数据集名称 |
| `DISABLE_BOT_ACCESS_LOG` | `false` | 跳过对已识别爬虫的访问日志 |

### AI slug 生成

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AI_MODEL` | `@cf/meta/llama-3.1-8b-instruct` | 用于推荐 slug 的 Workers AI 模型 |
| `AI_PROMPT` | — | slug 生成提示词的可选覆盖 |

## 数据库

`DB_TYPE` 选择驱动，且**两种驱动在生产 Workers 上都可运行**：

- `DB_TYPE=d1` —— 使用 `DB` 绑定（Cloudflare D1）。
- `DB_TYPE=libsql` —— 使用 `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN`（远程 Turso，或通过 `file:./src/database/data.db` 使用本地 SQLite 文件离线开发）。

> Workers 上的 LibSQL 依赖 `next.config.ts` 中的 `serverExternalPackages`（`@libsql/client`、`@libsql/hrana-client`、`@libsql/isomorphic-ws`）。这些必须保持 external，wrangler 才能通过 `workerd` 导出条件解析它们 —— 移除会导致 OpenNext 构建报错 `Could not resolve @libsql/isomorphic-ws`。参见 [OpenNext workerd 指南](https://opennext.js.org/cloudflare/howtos/workerd)。

### 手动初始化一条链接

向 `links` 表插入一行（`id`、`slug`、`domain`、`url`，以及可选的 `config` JSON）。当 `CASE_SENSITIVE=false` 时，`slug` 需以小写存储。`config` 示例：

```json
{
  "geo": { "US": "https://example.com/us" },
  "apple": "https://apps.apple.com/...",
  "google": "https://play.google.com/...",
  "title": "Example",
  "description": "An example link",
  "passwordHash": "<saltHex>:<hashHex> — 见 @cdlab996/utils hashPasswordFn",
  "unsafe": false,
  "redirectWithQuery": true
}
```

目标 URL 必须是 `http(s)`；其他协议（`javascript:`、`data:` 等）在 OG / 中间页上会被渲染为 `about:blank`。

## 鉴权

鉴权使用 **better-auth**，仅支持 Google + GitHub 社交登录 —— 账号首次登录会自动创建用户（登录即注册），不提供邮箱/密码方式。

将每个 OAuth 应用的回调地址配置为 `{BETTER_AUTH_URL}/api/auth/callback/{google|github}`。未配置凭据的提供方将不可用；至少需配置一个才能登录。

> **任何**登录成功的 Google / GitHub 账号都会获得后台访问权限 —— 若需保持私密，请在前面再加一层访问控制（Cloudflare Access、IP 白名单等）。

## 部署

```bash
pnpm --filter @cdlab996/flnk deploy
```

需要 Cloudflare 绑定：`KV`、`AI`、`ANALYTICS`（Analytics Engine），以及当前 `DB_TYPE` 对应的数据库 —— `DB` 绑定（D1）或 `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN`（Turso；通过 `wrangler secret put LIBSQL_AUTH_TOKEN` 设置令牌，不要提交）。详见 `wrangler.jsonc`。

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
