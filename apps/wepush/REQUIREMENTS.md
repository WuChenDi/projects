# wepush — 需求文档（v1.0 定稿）

> 微信公众号推送的 Web 控制台。Next.js 全栈，Drizzle 持久化。单人自用。
> 借鉴青龙脚本 `tmp/wechat-public-account-push/qinglong/qinglong-push.js` 的功能集，**不向后兼容**——新项目，不做旧版适配。

状态：定稿，可开始 M1 骨架。已对齐 flox（密码门）、dropply-api（DB 模式）、text2img（`@opennextjs/cloudflare` 部署）。

> **实施后偏离**：本文件保留作为初始需求记录。**实际"已发布"行为以 [README.md](./README.md) 为准**。主要差异：
>
> - ❌ 天行 API 整套移除（限额 + 需 key，itboy 已能覆盖天气需求）
> - ✅ 农历纪念日支持（新加 `tyme4ts`，每条纪念日带 `isLunar` 开关）
> - ✅ 索引生日变量 `birthday_0..birthday_9`（不只一个 `birthday_message`）
> - ✅ 城市编码选择器 + 区县码自动回退到市级
> - ✅ 模板编辑器加结构预览 + 真实数据预览
> - ✅ 日期字段统一改用 DatePicker / MonthDayPicker

---

## 1. 项目定位

- 应用名：`wepush`（路径 `apps/wepush`，包名 `@cdlab/wepush`）
- 取代旧版"环境变量塞 JSON + 青龙脚本"的部署模式：
  - **配置入库**：用户、模板、全局配置全部进 DB，UI 增删改
  - **日志入库**：每次推送结果（成功/失败/payload）持久化，可查可重放
- 推送触发：
  - UI 手动
  - Worker `scheduled()` 内置 cron（由 `@opennextjs/cloudflare` 的 Worker 部署支持）
  - HTTP API（外部 cron / GitHub Actions 也可调）

---

## 2. 功能模块

### 2.1 接收人管理（users）
- 字段：昵称、微信 OpenID、微信模板 ID、关联本地模板、城市、`weatherCityCode`、星座日期、`showColor`
- 子配置（独立表，外键到 user）：
  - **纪念日列表**（生日 / 周年）
  - **自定义累计日**（如 `love_day` → "在一起第 X 天"）
  - **天行 API 开关**（早安/晚安/天气/热搜数量/热搜格式）
- 操作：增删改、启用/禁用、立即推送（单人）

**❌ 不做**：课程表（含单双周）。

### 2.2 模板管理（templates）
- 字段：`id`（业务唯一码）、`title`、`desc`（含模板变量）
- 编辑器：
  - 变量插入助手（点击插入 `{{date.DATA}}` 等）
  - 实时预览：选定用户后渲染最终文本
- 模板变量保留原脚本支持的全部（除课程表的 `{{today_courses.DATA}}` 外）

### 2.3 全局配置（global_config 单行表，UI 可编辑）
- 微信：`APP_ID`、`APP_SECRET`、默认 `wechatTemplateId`
- 天行 API：`TIAN_API_KEY`
- 节流参数：`MAX_PUSH_ONE_MINUTE`、`SLEEP_TIME`、`API_TIMEOUT`、`MAX_RETRIES`、`RETRY_DELAY`
- 触发 token：`pushApiToken`（调 `/api/push/run` 用，UI 可重置）
- Cron 配置：`cronEnabled`、`cronUserIds`（哪些用户参与定时推送；不在列表里的只能手动触发）

> 唯一**不进 DB**的是 `ACCESS_PASSWORD`（密码门，必须 env；否则鸡生蛋问题）。

### 2.4 推送执行
**触发方式**：
1. **UI 手动**：单用户 / 全部
2. **Worker scheduled**：wrangler `triggers.crons` 触发，调内部推送函数
3. **HTTP API**：`POST /api/push/run`（带 `pushApiToken`）—— 给外部 cron 用

**数据源**（与青龙脚本一致）：
- 基础天气（`t.weather.itboy.net`）
- Hitokoto 一言
- iCIBA 每日一句（中英）
- 天行 API：早安心语 / 晚安心语 / 天行天气 / 全网热搜
- 内置：日期、生日倒数、自定义累计日

**推送渠道**：仅微信测试号模板消息
- ❌ 不做 PushDeer / Bark / Server 酱 / Webhook 等其他渠道

### 2.5 推送日志（push_logs）
每次推送一条记录，**永久保留**（不做定时清理）：
- 触发来源（manual / api / cron）、触发时间
- 目标用户、渠道、使用的模板 id
- 状态：success / failed
- 实际发出的 payload（渲染后的 title + desc）
- 错误信息（堆栈、HTTP 状态、第三方接口返回）
- 关联运行批次 ID（一次"全量推送"产生一个 batch）

UI：
- 列表（按时间倒序，可按用户 / 状态过滤）
- 详情页（展开 payload、错误、变量快照）
- 失败重试按钮

### 2.6 调试
- 模板预览：指定模板 + 用户 → 渲染结果
- 数据源探测：单独调用某个外部接口看返回（天气、Hitokoto、天行等）

**❌ 不做**：Dry-run、测试模式用户、首次启动引导、旧 ALL_CONFIG 导入。

---

## 3. 技术架构

| 项 | 选型 | 参考 |
|---|---|---|
| 框架 | Next.js 15 App Router + React 19 + TypeScript | text2img / flox |
| 路由 | `app/`（**不分 locale**，中文硬编码） | flox |
| UI | `@cdlab/ui` 基础组件（shadcn + Tailwind v4） | flox / text2img |
| 状态 | Zustand + TanStack Query | flox |
| ORM | **Drizzle**（dev：LibSQL 文件；prod：Cloudflare D1） | dropply-api |
| 校验 | `import * as z from 'zod'` | 一致 |
| Lint | 工作区根 Biome | 一致 |
| 部署 | **`@opennextjs/cloudflare`**（Cloudflare Workers，**支持 cron**） | text2img |

### 3.1 鉴权方案（已确认，对齐 flox）

无登录页、无 session 表，单一访问密码门：

- `ACCESS_PASSWORD` 来自 env（CF Worker → Vars & Secrets）
- 客户端 `@cdlab/utils` 的 `hashPasswordFn` 在浏览器算哈希
- `POST /api/config` 把 hash 提交，服务端 `verifyPasswordFn(hash, ACCESS_PASSWORD)` 校验
- 校验通过后哈希存 `useUnlockStore`（zustand-persist），下次免输入
- `<PasswordGate hasEnvPassword={...}>` 包根布局，未解锁时只渲染门
- HTTP API 触发推送 `/api/push/run` 用 **`pushApiToken`**（存 DB，UI 可重置）

### 3.2 DB 方案（已确认，对齐 dropply-api）

- `drizzle.config.ts`：env `DB_TYPE` 切换 `libsql`（默认）/ `d1`
  - LibSQL：`LIBSQL_URL`（默认 `file:./src/database/data.db`）+ `LIBSQL_AUTH_TOKEN`
  - D1：`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_DATABASE_ID` + `CLOUDFLARE_API_TOKEN`
- 运行期 `src/lib/db.ts`：`DatabaseManager` 单例，按 `DB_TYPE` 选 `drizzleSqlite` / `drizzleD1`
  - **dropply-api 是 Hono Worker，从 `c.env.DB` 拿 D1 绑定**
  - **wepush 是 Next.js on `@opennextjs/cloudflare`，从 `getCloudflareContext().env.DB` 拿绑定**
- 所有表使用 `trackingFields`（`createdAt` / `updatedAt` / `isDeleted`），软删
- Drizzle 命令保持一致：`db:gen` / `db:migrate` / `cf:localdb` / `cf:remotedb` / `db:studio --port 3020`

### 3.3 部署 / 调度（已确认）

- `pnpm deploy` → `opennextjs-cloudflare build && opennextjs-cloudflare deploy`（同 text2img）
- 产物：Cloudflare **Workers**（不是 Pages），`.open-next/worker.js`
- 在 `wrangler.jsonc` 配置：
  - `d1_databases` binding（name `DB`）
  - `vars` 公开变量；secret 用 `wrangler secret put`
  - `triggers.crons`：内置 cron 表达式（取代外部触发）
- 自定义 Worker 入口包装：在默认 `.open-next/worker.js` 之上加 `scheduled(event, env, ctx)` 导出，触发时调用推送服务
- 本地 `pnpm dev` 用 `nsl run next dev`，访问 `http://wepush.localhost:3355`

---

## 4. 数据库设计（Drizzle schema 初稿）

所有表带 `createdAt` / `updatedAt` / `isDeleted`（沿用 monorepo `trackingFields` 约定）。

```ts
// 全局配置（单行表，id 固定 = 1，全部 UI 可改）
global_config {
  id: 1
  wechatAppId, wechatAppSecret, defaultWechatTemplateId
  tianApiKey
  maxPushOneMinute, sleepTime, apiTimeout, maxRetries, retryDelay
  pushApiToken                     // 调 /api/push/run 用，UI 可重置
  cronEnabled (boolean)
  cronUserIds (json: string[])     // 参与 cron 的用户 ID
}

// 推送模板
templates {
  id (uuid)
  code (string, unique)            // 业务码，对应原 useTemplateId
  title, desc
}

// 接收人
users {
  id (uuid)
  name
  wechatOpenId, wechatTemplateId   // 微信渠道（唯一渠道）
  templateCode                     // FK → templates.code
  city, weatherCityCode
  horoscopeDate                    // MM-DD
  showColor (boolean, default true)
  enabled (boolean, default true)
  tianApi (json: { morning, evening, weatherDays, hotCount, hotType })
}

// 用户的纪念日
festivals {
  id, userId (FK)
  name                             // "生日" / "结婚纪念日"
  date                             // MM-DD
}

// 用户的累计日
custom_dates {
  id, userId (FK)
  keyword                          // "love_day"
  date                             // YYYY-MM-DD
}

// 推送批次（一次"全量推送"对应一条）
push_batches {
  id (uuid)
  trigger (enum: manual | api | cron)
  status (enum: running | success | partial | failed)
  totalCount, successCount, failedCount
  startedAt, finishedAt
}

// 推送日志（单条推送一条）
push_logs {
  id (uuid)
  batchId (FK)
  userId (FK)
  templateCode
  status (enum: success | failed)
  renderedTitle, renderedDesc      // 实际发出的内容
  variableSnapshot (json)          // 渲染时用到的变量值
  errorMessage, errorPayload (json)
  sentAt
}
```

---

## 5. 路由 / API 设计

### 5.1 页面路由（不分 locale）

```
/                       Dashboard（最近推送、用户数、模板数、近 24h 成功率）
/users                  接收人列表
/users/new              新建
/users/[id]             编辑（含纪念日 / 累计日 / 天行开关）
/templates              模板列表
/templates/[id]         模板编辑器（含变量预览）
/logs                   推送日志（按用户 / 状态 / 批次过滤 + 详情抽屉）
/logs/batches/[id]      批次详情
/settings               全局配置（含 cron 开关、参与用户、API token 重置）
/debug                  数据源探测
```

> 无登录页：根布局用 `<PasswordGate>`（同 flox），未解锁时遮罩整站。

### 5.2 API 路由（`app/api/**`）

```
GET    /api/config            // { hasEnvPassword, persistPassword }
POST   /api/config            // body: { hash }；返回 { valid }

GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET    /api/templates
POST   /api/templates
PATCH  /api/templates/:id
DELETE /api/templates/:id

GET    /api/settings          // global_config 读
PATCH  /api/settings          // global_config 改

POST   /api/push/preview      // body: { userId, templateCode } → 渲染结果（不发送）
POST   /api/push/run          // 真实推送，header: Authorization: Bearer <pushApiToken>
                              // body: { userIds?: [] }；为空 = 全员
POST   /api/push/retry        // body: { logId } 重发某条失败日志

GET    /api/logs              // 过滤参数: userId / status / batchId / dateRange
GET    /api/logs/:id
GET    /api/batches/:id

GET    /api/debug/source/:name  // 调外部接口看返回（天气/hitokoto/天行/iciba）
```

---

## 6. 目录结构

```
apps/wepush/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                       // 包 <PasswordGate hasEnvPassword>
│  │  ├─ page.tsx                         // Dashboard
│  │  ├─ users/...
│  │  ├─ templates/...
│  │  ├─ logs/...
│  │  ├─ settings/...
│  │  ├─ debug/...
│  │  └─ api/
│  │     ├─ config/route.ts               // 同 flox：GET 暴露状态，POST 校验 hash
│  │     ├─ users/{route.ts, [id]/route.ts}
│  │     ├─ templates/{route.ts, [id]/route.ts}
│  │     ├─ settings/route.ts             // global_config CRUD
│  │     ├─ push/{run,preview,retry}/route.ts
│  │     ├─ logs/{route.ts, [id]/route.ts}
│  │     ├─ batches/[id]/route.ts
│  │     └─ debug/source/[name]/route.ts
│  ├─ database/
│  │  ├─ schema.ts                        // Drizzle schema（含 trackingFields）
│  │  └─ migrations/                      // drizzle-kit generate 输出
│  ├─ lib/
│  │  ├─ db.ts                            // DatabaseManager（libsql / d1 双驱动）
│  │  ├─ cf.ts                            // getCloudflareContext() 包装
│  │  ├─ env.ts
│  │  └─ logger.ts
│  ├─ services/
│  │  ├─ push/                            // 节流 / 重试 / 批次管理
│  │  ├─ channels/wechat.ts
│  │  ├─ sources/{weather.ts, hitokoto.ts, tianapi.ts, iciba.ts}
│  │  ├─ template/                        // 变量渲染引擎
│  │  └─ calendar/                        // 生日 / 累计日计算
│  ├─ worker/
│  │  └─ index.ts                         // 包装 .open-next/worker.js + scheduled()
│  ├─ components/
│  │  ├─ PasswordGate.tsx                 // 同 flox（暂复制，先不抽公共包）
│  │  └─ ...
│  └─ stores/
│     ├─ unlock-store.ts                  // 同 flox
│     └─ ...
├─ drizzle.config.ts
├─ next.config.ts
├─ open-next.config.ts                    // 同 text2img
├─ wrangler.jsonc                         // D1 binding + triggers.crons
├─ cloudflare-env.d.ts                    // wrangler types 生成
├─ package.json
└─ tsconfig.json
```

---

## 7. 安全

- 访问门：见 §3.1（env `ACCESS_PASSWORD`）
- API 触发：`Authorization: Bearer <pushApiToken>`（DB 字段，UI 可重置）
- 写操作全部 Zod 校验
- Drizzle 默认 prepared statements，无 SQL 注入

---

## 8. 实现里程碑

1. **M1 骨架**：项目脚手架（参考 text2img 的 opennext 配置 + dropply-api 的 drizzle 配置）、Drizzle schema + 迁移、`<PasswordGate>` 接入、全局配置页
2. **M2 配置管理**：用户 / 模板 / 纪念日 / 累计日 CRUD + UI
3. **M3 推送内核**：数据源 services、模板渲染、微信渠道、批次/日志写入
4. **M4 触发与日志**：UI 手动触发 / HTTP API 触发 / 日志列表 / 详情 / 重试
5. **M5 Cron + 打磨**：Worker scheduled 包装、数据源探测、响应式打磨、错误兜底

---

## 9. 已确认 / 待确认

**已确认（本轮）**：
- ✅ 应用名 `wepush`，单人自用
- ✅ 配置全部入库（含微信 APP_ID/SECRET、天行 KEY），UI 可改；仅 `ACCESS_PASSWORD` 保留 env
- ✅ 推送日志全部入库，**永久保留**，不做定时清理
- ✅ 部署：`@opennextjs/cloudflare`（同 text2img），CF Worker + D1
- ✅ 调度：Worker `scheduled()` + wrangler `triggers.crons` 内置（不再需要外部 cron）
- ✅ 鉴权：flox 式密码门（env + 客户端 hash + zustand），无登录页、无 session
- ✅ DB：dropply-api 式 Drizzle 双驱动（libsql / d1）
- ✅ 不分 locale，UI 中文硬编码
- ✅ UI 用 `@cdlab/ui` 现有基础组件，**不做 PWA**

**不做**：
- ❌ 课程表
- ❌ PushDeer / Bark / Server酱 等其他推送渠道
- ❌ Dry-run
- ❌ "测试模式"用户
- ❌ 首次启动引导
- ❌ 旧 ALL_CONFIG 导入

> 所有需求已定稿，下一步开始 M1 骨架。
