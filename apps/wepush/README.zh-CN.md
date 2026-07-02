# wepush

[English](./README.md) | [中文](./README.zh-CN.md)

微信测试号模板消息推送的 Web 控制台 —— 收件人、模板、定时推送、永久推送日志。取代旧版 `ALL_CONFIG` 环境变量 + 青龙脚本的部署方式，所有配置入库、UI 可改。

预览：https://wepush.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/wepush/og-image.png)

## 功能

- 接收人管理：城市、纪念日、累计日，支持农历
- 模板编辑器：实时结构预览 + 选用户的真实数据渲染预览
- 推送触发：UI 手动（单人 / 全部）、HTTP API（Bearer 鉴权）、Worker `scheduled()` 定时
- 永久推送日志：批次分组、状态/时间/用户筛选、payload 快照、一键重发
- 数据源探测页 `/debug`：基础天气、Hitokoto、iCIBA 单独调试
- 账号登录（**better-auth**，Google / GitHub，登录即注册）；数据按账号隔离(`ownerId`)——每个用户只能看到自己的接收人 / 模板 / 日志 / 配置

## 技术栈

- **框架**：Next.js 16 App Router + React 19 + TypeScript
- **鉴权**：`better-auth`（Google / GitHub OAuth,仅社交登录）
- **UI**：`@cdlab996/ui`（shadcn + Tailwind v4）+ TanStack Query / Form + Zustand
- **ORM**：Drizzle，双驱动（`libsql` 用于 dev / Turso，`d1` 用于 Cloudflare）
- **日历**：`react-day-picker`（日期选择）+ `tyme4ts`（公历 / 农历转换）
- **部署**：`@opennextjs/cloudflare` → Cloudflare Workers（支持 cron）

## 快速开始

### 先决条件

- Node.js 20+
- pnpm
- 一个 SQLite 兼容数据库（任选）：
  - 本地 `libsql` 文件（默认零配置）
  - [Turso](https://turso.tech) 远程 libsql
  - Cloudflare D1（生产环境）

### 安装

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example`（如有）或新建 `.env`：

```bash
# better-auth —— 必填。better-auth 签发 cookie / OAuth 跳转用的公开源地址
#（结尾不要带 /）。dev：http://wepush.localhost:3355
BETTER_AUTH_URL=http://wepush.localhost:3355
NEXT_PUBLIC_BETTER_AUTH_URL=http://wepush.localhost:3355
BETTER_AUTH_SECRET=        # openssl rand -base64 32

# OAuth 提供方 —— 至少配一个
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# DB 驱动：'libsql'（默认）或 'd1'
DB_TYPE=libsql

# DB_TYPE=libsql 时
LIBSQL_URL=file:./src/database/data.db   # 或 Turso URL
LIBSQL_AUTH_TOKEN=                       # Turso 必填

# 仅 drizzle-kit 在 DB_TYPE=d1 时用（运行时不需要）
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_DATABASE_ID=
CLOUDFLARE_API_TOKEN=
```

### 执行迁移

```bash
pnpm db:migrate            # libsql / Turso
# 或 D1
pnpm cf:localdb            # 本地 D1
pnpm cf:remotedb           # 远程 D1
```

### 启动 dev

```bash
pnpm dev
```

访问 <http://wepush.localhost:3355>，用 Google / GitHub 登录后，到 `/settings` 配置微信 APP_ID / APP_SECRET。

### 配置 OAuth 提供方

到各 provider 注册 OAuth 应用，回调地址设为
`<BETTER_AUTH_URL>/api/auth/callback/{google,github}`：

- **Google**：授权来源(JavaScript origin)填 `<BETTER_AUTH_URL>`，回调 URI 填
  `<BETTER_AUTH_URL>/api/auth/callback/google`；同意屏的隐私政策填
  `<BETTER_AUTH_URL>/privacy`、服务条款填 `/terms`。
- **GitHub**：Homepage 填 `<BETTER_AUTH_URL>`，回调填
  `<BETTER_AUTH_URL>/api/auth/callback/github`。

同一邮箱用不同 provider 登录会并到同一个账号(同一租户)。

### 部署到 Cloudflare Workers

```bash
# 1. 创建 D1
pnpm exec wrangler d1 create wepush
# 反注释 wrangler.jsonc 里的 d1_databases 区段，填 database_id

# 2. 注入 secrets（不进 git）。BETTER_AUTH_URL 放 wrangler.jsonc 的 vars 即可
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm exec wrangler secret put GITHUB_CLIENT_ID
pnpm exec wrangler secret put GITHUB_CLIENT_SECRET
pnpm exec wrangler secret put LIBSQL_AUTH_TOKEN   # 如生产用 Turso

# 3. 迁移远端 DB
pnpm cf:remotedb           # D1
# 或 pnpm db:migrate        # Turso（读 .env）

# 4. 构建 + 部署
pnpm deploy
```

> **LibSQL on Workers** 依赖 `next.config.ts` 里的 `serverExternalPackages`
> (`@libsql/client`、`@libsql/hrana-client`、`@libsql/isomorphic-ws`)。这几个包必须
> 保持 external，wrangler 才能通过 `workerd` export condition 解析它们；去掉会导致
> OpenNext 构建报错 "Could not resolve @libsql/isomorphic-ws"。参见
> <https://opennext.js.org/cloudflare/howtos/workerd>。

## 安全模型

**多租户** —— 每个账号拥有自己的数据，按 `ownerId` 隔离。

- 登录走 **better-auth**（Google / GitHub）。鉴权在服务端：dashboard 由服务端 session 校验把关，**每个** `/api/*` 路由都会再次校验 session(`requireSession`)并把查询限定到当前登录者的 `ownerId`。不再有"客户端密码门"——任何账号都无法读写他人的接收人 / 模板 / 日志 / 配置。
- **推送接口**（`/api/push/run`、`/api/push/retry`、批次重发）用 `requireOwner`：接受浏览器 session cookie **或** 按 owner 的 `Authorization: Bearer <pushApiToken>`,并限定在该 owner 范围内执行。
- 每个 owner 在 `user_config` 里有自己的微信凭据、节流 / cron 配置和推送 token。`GET /api/settings` 对 `wechatAppSecret` 和 `pushApiToken` 做掩码：明文只在写入或重置时一次性返回。

注册是开放的(任何能完成 Google/GitHub OAuth 的人都能注册账号)。若要限制谁能注册,可在前面套接入网关(Cloudflare Access / Zero Trust、IP 白名单、私有隧道),或在 `getAuth()` 里加邮箱白名单。

## 推送 API

所有 `/api/*` 路由都要求已登录的 session（见「安全模型」）。对外部调用方，推送与重试接口还接受按 owner 的 Bearer token（执行会限定在该 token 所属 owner）：

```bash
# 全员推送
curl -X POST https://<your-domain>/api/push/run \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "api"}'

# 指定用户
curl -X POST https://<your-domain>/api/push/run \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "api", "userIds": ["uuid-1", "uuid-2"]}'

# 失败重发
curl -X POST https://<your-domain>/api/push/retry \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" \
  -d '{"logId": "uuid"}'
```

`pushApiToken` 首次访问 `/settings` 时自动生成，Settings 页可重置。

## 定时推送（cron）

`wrangler.jsonc` 默认 `triggers.crons: ["30 23 * * *"]`（UTC，约北京 07:30，可改）。Worker 的 `scheduled()` 处理器**按 owner 展开**：扫描每条 `cronEnabled` 的 `user_config`，推送该 owner 的 `cronUserIds`。从 Settings 页即可按账号临时关闭定时，不用重新部署。

## 模板变量

变量用 `{{name.DATA}}` 写法。模板编辑器下方有变量按钮，点击插入。空值渲染为空字符串（不会泄漏原占位符）。

| 类别        | 变量                                                                                              | 来源              |
| ----------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| 内置        | `date`                                                                                            | 本地              |
| 基础天气    | `city`、`weather`、`max_temperature`、`min_temperature`、`wind_direction`、`wind_scale`、`temperature`、`humidity`、`pm25`、`pm10`、`air_quality`、`aqi`、`sunrise`、`sunset`、`notice`、`ganmao` | t.weather.itboy.net |
| 纪念日      | `birthday_message`（30 天内最近一条）、`birthday_0` … `birthday_9`（按时间排序）、累计日的 `<keyword>` | 用户配置          |
| 一言 / 一句 | `moment_copyrighting`、`english_note`、`chinese_note`                                             | Hitokoto / iCIBA  |

### 城市编码查找

`weatherCityCode` 使用 `t.weather.itboy.net` 的中国气象局站号格式（9 位）。选择器数据来自 `public/data/city-codes.json`（3240 条，来源 [`sundakai/China-Weather-City-Area-code`](https://github.com/sundakai/China-Weather-City-Area-code)）。itboy 没收录的区县码会自动回退到市级码 `xxxxxx01`。

刷新数据：

```bash
pnpm gen:cities
```

### 农历支持

每条纪念日有"农历"开关。农历 `MM-DD` 通过 `tyme4ts` 转换为下一次公历对应日；显示加 `(农历)` 后缀。

## 项目结构

```
src/
├── app/                # Next.js App Router：落地页 /、/login、/privacy、/terms、
│                       #   控制台 /dashboard/*、/api/*（含 /api/auth/[...all]）
├── components/         # UserForm、TemplateForm、DatePicker、layout/（侧栏、导航）等
├── database/           # Drizzle schema（better-auth 表 + 业务表）+ 迁移
├── lib/                # auth（better-auth getAuth/requireSession/requireOwner）、
│                       #   auth-client、db、http、push-client、template-variables
├── services/
│   ├── channels/wechat.ts        # 微信 access_token + 模板消息
│   ├── sources/{weather,hitokoto,iciba}.ts
│   ├── calendar/                 # 公历 + 农历日差计算
│   ├── template/render.ts        # {{var.DATA}} 替换 + 颜色
│   └── push/                     # aggregate、runner、scheduled（按 owner）
└── worker/index.ts     # 自定义 Worker 入口，包装 .open-next/worker.js + scheduled()
```

## 脚本

| 命令                | 用途                                               |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Next.js dev（nsl 代理 `http://wepush.localhost:3355`） |
| `pnpm build`        | Next.js 生产构建                                   |
| `pnpm deploy`       | `opennextjs-cloudflare build && deploy`           |
| `pnpm preview`      | 本地预览 Workers 构建                              |
| `pnpm db:gen`       | 从 schema 生成 Drizzle 迁移                        |
| `pnpm db:migrate`   | 应用待执行迁移（libsql / Turso）                   |
| `pnpm cf:localdb`   | 应用迁移到本地 D1                                  |
| `pnpm cf:remotedb`  | 应用迁移到远端 D1                                  |
| `pnpm db:studio`    | Drizzle Studio `http://localhost:3020`             |
| `pnpm gen:cities`   | 从上游刷新 `public/data/city-codes.json`           |
| `pnpm cf-typegen`   | 从 wrangler.jsonc 重新生成 `cloudflare-env.d.ts`   |

## License

MIT
