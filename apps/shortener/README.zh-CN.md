# shortener

[English](./README.md)

基于 [Hono](https://hono.dev/) + Cloudflare Workers 的短链服务 —— 通过 Drizzle 适配 D1/LibSQL，KV 缓存，JWT 鉴权的管理 API，由 Cloudflare Workers AI 生成语义化 slug，并接入 Analytics Engine 上报与查询。

## 功能特性

- **边缘运行时** —— Hono 部署在 Cloudflare Workers
- **可切换存储** —— Cloudflare D1 或 LibSQL/Turso，配置时由 `DB_TYPE` 决定
- **JWT (ES256) 鉴权** —— `/api/*` 路由需要 `Authorization: Bearer <jwt>`，公钥通过 `JWT_PUBKEY` 注入
- **KV 缓存** —— `url:{hash}`、`og:{hash}`、`ai:slug:{url}` 三类缓存键，更新/删除时自动失效
- **AI Slug 生成** —— 使用 Workers AI（默认 `@cf/meta/llama-3.1-8b-instruct`）生成语义化短码，KV 缓存，失败时回退到 Base62
- **Analytics Engine** —— 请求时实时上报，查询接口覆盖总览/时间序列/国家/来源/设备/浏览器/操作系统/单链接/实时活跃
- **OG 卡片渲染** —— 自动识别社交平台爬虫并返回 OG 元数据页面
- **定时清理** —— 每天 00:00 UTC 软删除过期短链并清理对应缓存
- **软删除** —— 所有表带 `isDeleted` 标志，禁止硬删除

## 本地开发

```bash
pnpm dev:shortener
```

通过 `nsl` 暴露在 `http://shortener.localhost:3355`。

## 部署

```bash
pnpm deploy:shortener
```

## 数据库

```bash
# 根据 schema 生成迁移文件
pnpm --filter @cdlab996/shortener db:gen

# 应用迁移到本地 D1
pnpm --filter @cdlab996/shortener cf:localdb

# 应用到远端 D1
pnpm --filter @cdlab996/shortener cf:remotedb

# 启动 Drizzle Studio（端口 3019）
pnpm --filter @cdlab996/shortener db:studio
```

`DB_TYPE` 在配置阶段决定 dialect（详见 `drizzle.config.ts`）：

- `d1`（`wrangler.jsonc` 默认值）—— Cloudflare D1，使用 `drizzle-kit … --driver d1-http`
- `libsql` —— LibSQL/Turso，默认 `file:./src/database/data.db`

## 配置

### 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `DEPLOY_RUNTIME` | `cf` 或 `node`（决定日志后端） | `cf` |
| `DB_TYPE` | `d1` 或 `libsql` | `d1` |
| `LIBSQL_URL` | LibSQL/Turso 连接 URL（LibSQL 模式） | `file:./src/database/data.db` |
| `LIBSQL_AUTH_TOKEN` | LibSQL 认证 token | — |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID（drizzle-kit + Analytics 查询用） | — |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | — |
| `JWT_PUBKEY` | 十六进制 ES256 公钥（未压缩 EC 点格式） | — |
| `ENABLE_AI_SLUG` | 启用 AI 生成 slug | `true` |
| `AI_MODEL` | Workers AI 模型 ID | `@cf/meta/llama-3.1-8b-instruct` |
| `AI_ENABLE_CACHE` | 缓存 AI 结果到 KV | `true` |
| `AI_MAX_RETRIES` | AI 重试次数 | `3` |
| `AI_TIMEOUT` | AI 超时（毫秒） | `10000` |
| `ANALYTICS_DATASET` | Analytics Engine 数据集名 | `shortener_analytics` |
| `ANALYTICS_SAMPLE_RATE` | Analytics 采样率 | `1.0` |
| `DISABLE_BOT_ANALYTICS` | 在统计中过滤 bot | `false` |

### 一次性初始化

```bash
# 生成 ES256 密钥对，把打印出来的 hex 公钥填到 JWT_PUBKEY
pnpm --filter @cdlab996/shortener generate-jwt

# 创建 D1 数据库，把返回的 id 填到 d1_databases[0].database_id
wrangler d1 create shortener-db

# 创建 KV namespace，把返回的 id 填到 kv_namespaces[0].id
wrangler kv namespace create SHORTENER_KV
```

Analytics Engine 数据集由 `wrangler.jsonc → analytics_engine_datasets` 自动创建。

### 定时任务

```jsonc
"triggers": { "crons": ["0 0 * * *"] }   // 每天 00:00 UTC
```

cron 处理函数会执行 `cleanupExpiredLinks` —— 软删除 `expiresAt < now()` 的记录，并清理对应的 `url:{hash}` / `og:{hash}` / `ai:slug:{url}` 缓存。

## HTTP API

所有 `/api/*` 路由需要 `Authorization: Bearer <jwt>`（ES256）。本地可用 `pnpm --filter @cdlab996/shortener generate-jwt` 生成测试 token。

### 公开接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/` | 服务健康检查 |
| `GET` | `/:shortCode` | 跳转或返回 OG 页面（自动识别爬虫） |
| `GET` | `/:shortCode/og` | 强制返回 OG 元数据页面 |

### 短链管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/url` | 列表（`?isDeleted=0\|1`） |
| `POST` | `/api/url` | 批量创建 |
| `PUT` | `/api/url` | 批量更新（按 `hash`） |
| `DELETE` | `/api/url` | 批量软删除（按 `hashList`） |
| `POST` | `/api/page` | 创建 page 记录 |

### AI

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/ai/slug` | 为 URL 生成语义化 slug |
| `POST` | `/api/ai/batch-slug` | 批量生成（最多 10 条 URL） |
| `GET` | `/api/ai/suggestions` | 为 URL 生成 N 个候选 slug |

### Analytics

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/analytics/overview` | 总览指标 |
| `GET` | `/api/analytics/timeseries` | 点击量 / 独立访客时间序列 |
| `GET` | `/api/analytics/top-countries` | 国家排行 |
| `GET` | `/api/analytics/top-referrers` | 来源排行 |
| `GET` | `/api/analytics/devices` | 设备类型分布 |
| `GET` | `/api/analytics/browsers` | 浏览器分布 |
| `GET` | `/api/analytics/operating-systems` | 操作系统分布 |
| `GET` | `/api/analytics/link/:hash` | 单链接维度统计 |
| `GET` | `/api/analytics/real-time` | 实时活跃 / 24 小时数据 |

成功响应使用 `{ code, message, data? }` 信封；错误返回 `{ statusCode, message, stack? }`（`stack` 仅在 `isDebug` 时输出）。

## 项目结构

```
src/
  index.ts              # Hono 入口、中间件、路由注册
  global.ts             # Logger 与 isDebug 全局变量
  cron/
    cleanup.ts          # 过期短链定时清理
  database/
    schema.ts           # Drizzle schema（links / pages）
    *.sql               # 生成的迁移文件
  lib/
    db.ts               # useDrizzle（D1 / LibSQL 切换）
    db-utils.ts         # 软删除辅助函数
  middleware/
    jwt.ts              # ES256 JWT 校验
    analytics.ts        # Analytics Engine 上报
  routes/
    shortcode.ts        # GET /:shortCode（跳转 / OG）
    api.ts              # /api/url 增删改查 + /api/page
    ai.ts               # /api/ai/slug、batch-slug、suggestions
    analytics.ts        # /api/analytics/*
  utils/
    hash.ts             # Base62 短码 + sha256 内部 hash
    slug.ts             # Workers AI 生成 slug
    analytics.ts        # Analytics Engine SQL 构造
    html.ts             # OG 元数据页面渲染
    validationSchemas.ts # Zod 请求 schema
  types/index.ts        # 共享类型（CloudflareEnv、Variables 等）
```

## 数据库 Schema

### `links`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER | 主键，自增 |
| `url` | TEXT | 目标 URL |
| `userId` | TEXT | 用户标识 |
| `hash` | TEXT | 内部 SHA-256 hash（唯一） |
| `shortCode` | TEXT | 用户可见短码 |
| `domain` | TEXT | 域名（多租户） |
| `expiresAt` | INTEGER | 过期时间戳（毫秒） |
| `attribute` | BLOB | 额外 JSON 属性 |
| `createdAt` | INTEGER | 自动追踪 |
| `updatedAt` | INTEGER | 自动追踪 |
| `isDeleted` | INTEGER | 软删除标志（0/1） |

索引：`links_hash`（`hash` 唯一）、`links_short_code_domain`（`shortCode + domain` 唯一）。

### `pages`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER | 主键，自增 |
| `userId` | TEXT | 用户标识 |
| `template` | TEXT | 页面模板名 |
| `data` | BLOB | 页面数据 |
| `hash` | TEXT | 唯一 hash |
| `expiresAt` | INTEGER | 过期时间戳（毫秒） |
| `attribute` | BLOB | 额外属性 |
| `createdAt` | INTEGER | 自动追踪 |
| `updatedAt` | INTEGER | 自动追踪 |
| `isDeleted` | INTEGER | 软删除标志（0/1） |

索引：`pages_hash`（`hash` 唯一）。

## 许可证

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
