# wepush

[English](./README.md) | [中文](./README.zh-CN.md)

微信测试号模板消息推送的 Web 控制台 —— 收件人、模板、定时推送、永久推送日志。取代旧版 `ALL_CONFIG` 环境变量 + 青龙脚本的部署方式，所有配置入库、UI 可改。

## 功能

- 接收人管理：城市、纪念日、累计日，支持农历
- 模板编辑器：实时结构预览 + 选用户的真实数据渲染预览
- 推送触发：UI 手动（单人 / 全部）、HTTP API（Bearer 鉴权）、Worker `scheduled()` 定时
- 永久推送日志：批次分组、状态/时间/用户筛选、payload 快照、一键重发
- 数据源探测页 `/debug`：基础天气、Hitokoto、iCIBA 单独调试
- 密码门（客户端 hash），无登录页，无 session 表

## 技术栈

- **框架**：Next.js 16 App Router + React 19 + TypeScript
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
# 密码门 —— 必填（非空即开启）
ACCESS_PASSWORD=change-me

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

访问 <http://wepush.localhost:3355>（通过 `@nsio/nsl` 路由）。用 `ACCESS_PASSWORD` 解锁，到 `/settings` 配置微信 APP_ID / APP_SECRET。

### 部署到 Cloudflare Workers

```bash
# 1. 创建 D1
pnpm exec wrangler d1 create wepush
# 反注释 wrangler.jsonc 里的 d1_databases 区段，填 database_id

# 2. 注入 secrets（不进 git）
pnpm exec wrangler secret put ACCESS_PASSWORD
pnpm exec wrangler secret put LIBSQL_AUTH_TOKEN   # 如生产用 Turso

# 3. 迁移远端 DB
pnpm cf:remotedb           # D1
# 或 pnpm db:migrate        # Turso（读 .env）

# 4. 构建 + 部署
pnpm deploy
```

## 推送 API

接收人 / 模板 CRUD 没有单独鉴权（已在密码门后）。推送与重试要求 Bearer：

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

`wrangler.jsonc` 默认 `triggers.crons: ["30 23 * * *"]`（UTC，约北京 07:30，可改）。Worker 的 `scheduled()` 处理器每次运行时读 `globalConfig.cronEnabled` + `globalConfig.cronUserIds`，所以从 Settings 页即可临时关闭定时，不用重新部署。

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
├── app/                # Next.js App Router（页面 + /api 路由）
├── components/         # PasswordGate、AppNav、UserForm、TemplateForm、DatePicker 等
├── database/           # Drizzle schema + 生成的迁移文件
├── lib/                # db、auth、http、logger、push-client、template-variables
├── services/
│   ├── channels/wechat.ts        # 微信 access_token + 模板消息
│   ├── sources/{weather,hitokoto,iciba}.ts
│   ├── calendar/                 # 公历 + 农历日差计算
│   ├── template/render.ts        # {{var.DATA}} 替换 + 颜色
│   └── push/                     # aggregate、runner、scheduled
├── stores/             # zustand（解锁 token）
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
