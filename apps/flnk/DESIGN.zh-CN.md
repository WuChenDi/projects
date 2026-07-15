# flnk — 设计

[English](./DESIGN.md) · **简体中文**

> 一个隐私优先、服务端权威的短链服务,跑在 Cloudflare Workers 上。
> 短链是一个**名字**,而非 URL:目标地址、路由规则、访问拦截都存在 D1,
> 在边缘经 KV 读穿缓存解析,而每次点击都写入 Analytics Engine——访客 IP
> 在入库前先做哈希。

这是权威设计规格;实现遵循它。章节号是稳定锚点——源码注释与评审以
`design §N` 引用它们。本项目是 [Sink](https://github.com/ccbikai/Sink)
(Cloudflare Workers 短链)的血统重写:导出格式与分析地球端点保持线格式兼容,
但引擎、拦截、数据模型与控制台在 Next.js + OpenNext 上重新实现。

**目录**

1. [背景与目标](#1-背景与目标)
2. [架构](#2-架构)
3. [跳转引擎](#3-跳转引擎)
4. [缓存模型](#4-缓存模型)
5. [安全拦截](#5-安全拦截)
6. [数据模型](#6-数据模型)
7. [分析](#7-分析)
8. [Launchpad](#8-launchpad)
9. [认证与多租户](#9-认证与多租户)
10. [配置与部署](#10-配置与部署)

---

## 1. 背景与目标

短链服务写起来平凡、写好却难:跳转路径是系统里最热的路由,它无需认证、面向
公网,天然是扫描器、开放重定向滥用与日志注入的目标。多数托管型短链在运维一侧
的解法是替它们自己做分析而追踪你的访客;多数自托管型则丢给你一个数据库和一台
虚拟机去跑。

`flnk` 走第三条路——一个你部署到自己账户里的 Cloudflare Worker——并以以下目标
自我约束:

- **G1 —— 服务端权威。** 目标地址被存储,绝不编码进短 URL。一条链接的目标、
  路由、拦截可以改变而无需重新签发。
- **G2 —— 边缘快、DB 轻。** 一条已缓存、无拦截的跳转必须以单次 KV 读取解析,
  **不**触库。未命中与扫描不得无节制地穿透到 D1。
- **G3 —— 隐私即构造。** 跳转路径上无追踪 Cookie;访客真实 IP 从不持久化——
  只存每日轮换的带密钥哈希。
- **G4 —— 默认安全。** 无需认证的跳转路径必须抵御开放重定向、日志注入、缓存
  穿透、暴力破解与 SSRF 滥用,而无需运维调参。
- **G5 —— 数据归你。** 分析存于你的 Analytics Engine 数据集;导出 / 导入 /
  备份是一等公民且非破坏性。

### 非目标

- 不是基于 Cookie 的网页分析套件——它统计点击,不跨站画像会话。
- 不是通用 CMS——Launchpad 是受约束的块模型,而非任意 HTML。
- *尚未*做硬多租户隔离——schema 已带 owner 字段、过滤漏斗也已就位,但当前
  基线是共享工作区(§9)。

---

## 2. 架构

```
                         Cloudflare 边缘
  访客 ─── GET /<slug> ──►┌───────────────────────────────────────┐
                          │ src/worker/index.ts                    │
  运营者 ── /dashboard ──►│  fetch  → OpenNext → Next.js App Router│
                          │  scheduled → 每日备份 + 清理           │
                          └──────┬───────────────┬────────────┬────┘
                                 │               │            │
                          KV 读穿缓存        D1 / libSQL    Analytics Engine
                          (缓存、计数、        (权威数据源)  (写数据点 +
                           拦截桶)                            SQL-API 读取)
                                                    │
                                                 R2(可选:资源 + 备份)
                                                 Workers AI(可选:slug/OG)
```

一个 Worker 承载两个入口面:

- **公开** —— `GET/POST /<slug>`(跳转引擎,§3)、`GET /<slug>/og`(社交预览)、
  `GET /m/<slug>`(Launchpad 页,§8)。无认证上下文;解析纯粹按 `(host, slug)`。
- **控制台** —— `/dashboard/*` 与 `/api/*`,由 better-auth 会话拦截(§9)。

**Worker 入口。** OpenNext 只产出 `fetch` 处理器。`src/worker/index.ts` 包裹
生成的 `.open-next/worker.js` 并添加 `scheduled()` 处理器,使 cron 路径(每日
备份 → 清理)运行时不触碰 OpenNext 的产物。cron 处理器**显式转发 `env`**——
`getCloudflareContext()` 只在 OpenNext 的 fetch 包装里安装,cron 冷启动无法
依赖它。

**双驱动。** `DB_TYPE` 在请求时选择 D1(`DB` 绑定)或 libSQL/Turso
(`LIBSQL_URL` + token),经 `@cdlab/db/web` 的 `defineDb(schema)` → `getDb(env?)`。
两者都在生产的 Workers 上运行。`getDb` 接受注入的 `env`,让无 fetch 上下文的
cron 路径也能解析驱动。`@libsql/client` 必须留在 `next.config.ts` 的
`serverExternalPackages` 里,wrangler 才会经 `workerd` 导出条件解析它——见
[OpenNext workerd 指南](https://opennext.js.org/cloudflare/howtos/workerd)。

**按 isolate 记忆化。** 认证实例(§9)与解析后的配置(§10)在每个 isolate 里
构建一次并复用——D1 绑定与 env 只在请求内存在,但一旦构建,在该 isolate 生命周期
内是稳定的。

---

## 3. 跳转引擎

**入口:** `src/app/[slug]/route.ts`(`GET` 处理点击 + 爬虫,`POST` 处理拦截
表单提交)。请求流经固定管线,每一段都是可短路的守卫:

```
GET /<slug>
  1. 保留 slug 守卫                     → 404          (绝不遮蔽 /api、/dashboard…)
  2. 按 IP 解析限流                     → 429          (原生绑定,fail open)
  3. resolveLink(domain, slug)          → null 则 404  (KV → D1 → 回填,§4)
  4. isExpired(expiresAt)               → 清缓存 + 404
  5. config.disabled                    → 404          (暂停,非删除)
  6. 点击上限(config.maxVisits)        → 落库 + 清缓存 + 404  (§5)
  7. 密码拦截(config.passwordHash)     → 表单 / 校验 (§5)
  8. 斗篷 / 社交爬虫                     → 返回 OG HTML 而非 3xx (§5)
  9. 不安全提示页(config.unsafe)       → 确认页 (§5)
 10. resolveDestination                 → 地域 → 设备 → query 合并
 11. 非 http(s) 目标守卫               → 404
 12. writeAccessLog(经 waitUntil)      → Analytics Engine(§7),不阻塞
 13. 308(表单 POST 后为 303)          → Location: <目标>
```

### 3.1 解析键

查找键是 `(domain, slug)`,而非仅 `slug`——`links` 带 `(slug, domain)` 复合唯一
索引,因此**同一 slug 按 host 指向不同目标**。`domain` 是请求主机名;单域部署
只需存 `domain = ''`。除非设了 `CASE_SENSITIVE`,slug 归一化为小写
(`normalizeSlug`)。

### 3.2 目标路由(`resolveDestination`)

路由是一条**对目标地址的覆盖级联——后写者胜**,而非首个匹配。从 `link.url` 开始:

1. `config.geo[cf.country]` —— ISO-3166-1 alpha-2 国家码 → URL(写入时国家码
   大写)。`cf.country` 是 Cloudflare 边缘 geo-IP,非客户端上报。
2. 若 UA 匹配 `iphone|ipad|ipod|crios` 则 `config.apple` —— **仅 iOS**;桌面
   macOS 被刻意排除,否则 Mac 访客会被送去链接的 App Store 地址。
3. 若 UA 匹配 `android` 则 `config.google`。

因为是级联,当两者都匹配时,**设备覆盖胜过地域覆盖**。随后,若 `redirectWithQuery`
开启(全局默认或按链接覆盖),入站 query 参数会合并到目标上它尚未拥有的键——
`qr` 除外,它是分析标记(§7),不转发。

### 3.3 跳转状态码

默认 `308 Permanent`(可缓存、保留方法)。跟随**表单 POST**(密码 / 不安全确认)
的跳转发出 `303 See Other`,让浏览器以 `GET` 重发——`307`/`308` 会保留方法并
向外部目标重发 POST,后者以 `405` 回应。

---

## 4. 缓存模型

KV 是 **D1 前的读穿缓存**,按 host 命名键为 `link:{domain}:{slug}`。`resolveLink`
(`src/lib/data/links/resolve.ts`)是唯一漏斗:

```
validateSlug 失败?  → 返回 null          (畸形 → 永不可能匹配行;跳过一切 I/O)
KV 命中(正)?      → 返回 Link          (热路径:单次 KV 读,不触 D1)
KV 命中(负)?      → 返回 null          (已知不存在;跳过 D1)
KV 未命中           → D1 SELECT WHERE slug, domain, is_deleted=0
   存在且有效         → writeCache;返回
   不存在             → writeNegativeCache;返回 null
```

### 4.1 正缓存

解析后的链接缓存 `LINK_CACHE_TTL` 秒(下限为 KV 的 60 秒)。**在该下限内即将过期
的链接不缓存**——否则陈旧条目可能比链接本身活得更久(KV 无法持有小于 60 秒的
TTL)。这些链接落到 D1;它们即将消失,流量可忽略。热路径读取保留原始行(标签
*ID*,未解析)——跳转从不显示标签名,故跳过名字解析的联表。

### 4.2 负缓存(缓存穿透守卫)

解析到无的 slug 会在同一键下写一个短 TTL **墓碑**(`__miss__` 哨兵),TTL 为
`NEGATIVE_CACHE_TTL` 秒。此后对同一缺失 slug 的洪泛查询便不再打 D1。两层防御
让墓碑表不被武器化:

- **先做形状守卫。** `validateSlug` 在任何 I/O 前拒绝畸形 slug,因此对垃圾路径的
  扫描连 KV 都到不了——不为垃圾写墓碑,只为形状合法但不存在的 slug 写。
- **原地覆盖。** 之后的 create/import 在*同一*键下写入真实链接,故 slug 立即可见,
  无需单独的失效步骤。

### 4.3 失效

写操作同步清除或覆盖 KV 条目(`purgeLink` / `writeCache`)。过期、达上限禁用、
时间过期都在跳转路径上 `purgeLink`,使下次请求重新对 D1 解析。

### 4.4 访问计数

`config.maxVisits` 用 KV 计数器 `visits:{id}`:热路径一次读取,经 `waitUntil`
后台自增。达上限时链接在 **D1 中**被禁用(`json_set($.disabled, true)`),使该上限
在缓存重建后依然生效——否则计数器会从零重启并再放行 N 次访问。KV 是最终一致的,
因此并发下上限是近似的(有意为之:可用性优先于精确)。

---

## 5. 安全拦截

跳转路径无需认证、面向公网;每道拦截都**故障安全**,且排序使任何一道都无法被
另一道绕过。

### 5.1 排序不变式

**密码拦截先于 OG/斗篷分支运行**。若斗篷先跑,社交爬虫会经 `og:url` 收到目标而
击破密码。故:密码 → 斗篷/爬虫 → 不安全 → 跳转。

### 5.2 密码(Argon2id)

`config.passwordHash` 是 Argon2id 的 `saltHex:hashHex`(经 `@cdlab/utils`),绝非
明文。两条路径:

- **浏览器** —— HTML 表单;密码错误重发表单(`401`)。
- **程序化** —— 头 `x-link-password`(不安全链接再加 `x-link-confirm`);失败返回
  `403`,而非表单。

暴力破解按 `(ip, slug)` 用 KV 桶 `pwfail:{ip}:{slug}` 限次(5 次 / 600 秒 → `429`)。

### 5.3 Gate token(不安全确认链)

一条既不安全又受密码保护的链接,需要第二步确认而不把明文密码回显进 HTML。密码
正确后,服务端签发一个 **gate token**(`src/lib/redirect/gate-token.ts`):对
`slug:ip:expiresAtMs` 做 HMAC-SHA-256,密钥由 `BETTER_AUTH_SECRET` 经 HKDF 派生,
5 分钟 TTL,绑定 IP,常数时间校验。不安全确认表单携带该 token 而非密码;有效 token
视为已验密码。

### 5.4 开放重定向与日志注入防御

- **协议白名单。** 路由后,协议非 `http:`/`https:` 的目标(`javascript:`、
  `data:`…)→ `404`。畸形 URL → `404`。
- **记录存储的 URL,而非合并后的。** 访问日志记录 `link.url`(所有者可控),绝非
  query 合并后的 `dest`(访客可控)——于是精心构造的 `?…` 无法把任意数据注入日志
  blob。

### 5.5 SSRF 加固(服务端 fetch)

两个功能会从 Worker 拉取运营者提供的 URL——链接健康检查与 Safe Browsing
(见 `src/lib/ai/`)。两者都归一化 IPv4/IPv6-mapped/编码形式,封禁私有 / 环回 /
链路本地 / CGNAT 段,拒绝授权部分里的 `userinfo`,并使用 `redirect: 'manual'`。
平台标志 `global_fetch_strictly_public` 是第二重 Worker 级 SSRF 兜底。

### 5.6 限流汇总

| 面 | 机制 | 限制 | 触发时 |
| --- | --- | --- | --- |
| `/<slug>` 解析 | 原生 Rate Limiting 绑定(按 colo) | 每 IP 100 / 60 秒 | `429`,fail open |
| 密码尝试 | KV `pwfail:{ip}:{slug}` | 5 / 600 秒 | `429` |
| Launchpad 追踪 | KV `lptrack` | 60 / 60 秒 | 丢弃 |
| 认证 | better-auth,按 `cf-connecting-ip` | 内建 | `429` |

---

## 6. 数据模型

Drizzle over SQLite(`src/database/schema.ts`)。每个业务表共享一个
`trackingFields` 块——`createdAt`、`updatedAt`(`$onUpdateFn`)、`isDeleted`
(软删除;**绝不硬删**)。

| 表 | 用途 | 关键约束 |
| --- | --- | --- |
| `links` | 短链:`url`、`config`(JSON)、`tags`(标签 ID 的 JSON)、`expiresAt`、`createdBy`。 | **`(slug, domain)` 唯一** —— 跳转键;也覆盖软删行,故 slug 可原地复活。 |
| `launchpads` | Bio-link 页:`config`(JSON)、`og`、`status`、`ownerId`。 | `slug` **全局唯一** —— 公开路由无 host/认证上下文。 |
| `tags` | 标签字典——每名一行。 | `name` 唯一。链接存标签 **ID**,故重命名是一行,无扇出。 |
| `user` / `session` / `account` / `verification` | better-auth 核心表。 | 表 / 列名须匹配 better-auth 适配器期望。 |

### 6.1 为何用 JSON 配置列

`links.config`(`LinkConfig`)与 `launchpads.config`(`LaunchpadConfig`)是单个
JSON 列。跳转引擎*从一行读出做决策所需的一切*——路由、拦截、OG、二维码样式——
热路径无联表。代价(无法按字段建索引)可接受,因为唯一的索引查找就是
`(slug, domain)`。

### 6.2 标签间接

`links.tags` 存标签 **ID**;`tags` 表是名字的唯一真源。仓储层在把链接交给
API/UI 前把 ID 解析为名字(故 `Link.tags` 始终是名字列表),但跳转热路径不读这些
ID。因此重命名标签是 O(1)。

### 6.3 原地复活

`(slug, domain)` 唯一索引有意覆盖软删行。create/import 必须看到删除的行才能复活
它而非冲突——这正是让导入非破坏(§10)、让删除的 slug 可回收的机制。

---

## 7. 分析

自托管、无 Cookie、隐私保护。点击与 Launchpad 浏览变成 **Analytics Engine**
数据点;控制台经 AE SQL REST API 读回。

### 7.1 写路径

`extractAccessLog`(`src/lib/analytics/analytics.ts`)从请求 + `request.cf`
(国家 / 地区 / 城市 / 时区 / colo / 经纬度)+ `ua-parser-js`(系统 / 浏览器 /
设备)构建记录。`writeAccessLog` 发出**一个数据点**:`indexes: [slug]`、**19 个
blob**(blob1..19,映射在 `analytics-query.ts`)、`doubles: [lat, lng]`。经
`ctx.waitUntil` 触发——日志失败绝不影响跳转。`blob19`(`type`)区分
`link` / `launchpad` / `launchpad_block`,使两个家族永不互相灌水。`blob18`
(`source`)当 URL 带 `?qr=1` 时为 `qr`,否则 `link`。

### 7.2 IP 匿名化

真实 IP 从不离开请求。`anonymizeIp` 存
`hex(HMAC-SHA-256("${ip}:${YYYY-MM-DD}"))` 截断为 32 字符,以密钥 pepper
(`ANALYTICS_IP_SALT`;未设时回退到*由* `BETTER_AUTH_SECRET` 派生的密钥,**绝非**
公开盐)加密。该摘要是每日轮换的指纹:独立访客数在一个 UTC 日内成立,但没有
pepper 就无法从公开数据反推出 IP。

### 7.3 读路径

AE 绑定只**写**;读走 AE SQL REST API(`CLOUDFLARE_ACCOUNT_ID` + 一个带
Analytics `Read` 的 token)。查询是 ClickHouse 方言 SQL;访客可控的过滤值经一个
反斜杠安全的 `sanitize`。计数是**采样加权**的(`SUM(_sample_interval)`、缩放的
`COUNT(DISTINCT ip)`)。构建器覆盖计数、按时间分桶的浏览、按维度 top-N(13 个
维度)、地图坐标、近期事件实时流、CSV 导出,以及 Launchpad 浏览 / 块统计。

---

## 8. Launchpad

**Launchpad** 是托管在 `/m/<slug>` 的 link-in-bio / 落地页。

### 8.1 模型

`LaunchpadConfig` 是单个 JSON 列:`profile`(头像/名字/简介)、`theme`(预设、
颜色、按钮形状/填充/阴影、背景与页头表面——纯色/渐变/图片、字体、布局:
classic/left/hero/banner/cover/compact)、页级 `socials` 栏、`hideBranding`,以及
一个**有序 `blocks` 数组**(数组顺序 = 渲染顺序)。块类型:`header`、`socials`、
`button`、`shortlink`、`image`、`text`、`divider`。

### 8.2 块按 ID 引用链接

`button`/`shortlink` 块存**链接 ID 引用,绝非复制的 URL**。点击经短链自己的
`/<slug>` 路由,因此它们**复用短链的统计与可编辑的目标**——编辑链接即更新
Launchpad 按钮而无需重新发布,且 Launchpad 点击也出现在链接的分析里。

### 8.3 渲染与安全

`src/app/m/[slug]/page.tsx` 是 `force-dynamic`:每次加载都重新解析 Launchpad
(发布 + 过期检查),故绝不缓存快照。它批量解析链接引用(跳过软删),发一个
`launchpad` 浏览点,渲染 `LaunchpadView`。由于 Launchpad 配置是运营者编写的
近 HTML 数据,两端都做加固:Zod schema(`src/schemas/`)拒绝非 http(s) 的 href
与会破坏 CSS 的图片 URL;渲染器再次消毒 href 与 CSS `url()` 值,并对所选表面
自动计算可读的墨色对比。客户端 `LaunchpadTracker` 把块点击信标发到公开、限流的
`/api/launchpad/track`,后者在写 `launchpad_block` 点前先校验 slug 确为已发布的
Launchpad。

---

## 9. 认证与多租户

**better-auth** 配 Drizzle(sqlite)适配器,按 isolate 惰性构建(`getAuth`)——
在 Workers 上 D1 绑定与 env 只在请求内存在。

- **仅社交登录** —— Google 与 GitHub OAuth;每个 provider 仅在其 client id +
  secret 均设置时启用。首次社交登录*即*注册。
- **邮箱白名单**(`ALLOWED_EMAILS`,逗号分隔、大小写不敏感)在两处执行:
  `databaseHooks.user.create.before` 阻断非白名单邮箱的首次登录(注册闸),且每次
  会话检查都重测该名单——因此**收紧白名单会吊销现有会话**。空名单 = 全放行
  (记一次警告)。
- IP 固定为 `cf-connecting-ip`(better-auth 默认 `X-Forwarded-For`,在 Workers 上
  缺失,否则限流会坍缩为单个共享桶)。

**服务端授权。** 控制台 API 在服务端拦截,而非靠前端检查:

- `requireSession(request)` —— API 闸:`401`(无会话)/ `403`(不在白名单)或
  `{ ok, user }`。
- `getAllowedSession(headers)` —— 控制台服务端布局闸;为 null 时跳登录。
- `withAuth(schema, handler)` —— 变更包装器:会话闸 + Zod body 校验 + 统一
  `{ error }` 信封,传入 `{ user, request, env }` 与一个用于显式状态码的
  `ApiError`。

**多租户(已设计,尚未强制)。** 每次写入都盖 `ownerId`(launchpads)/
`createdBy`(links),而 owner 过滤经单一 `scopeToOwner(conds, session)` 漏斗——
**今天是 no-op**(共享工作区)。切到按租户隔离只是那个漏斗里的一行改动,**无需
schema 回填**,因为每行都已带其 owner。

---

## 10. 配置与部署

### 10.1 配置

所有运行时开关都是 `wrangler.jsonc` 里的 `vars`;`src/lib/platform/env.ts`
**按 isolate 解析并 Zod 校验一次**(`getConfig`),三级优先:显式 `env` 参数
(cron 路径)→ fetch 时的 Cloudflare 上下文 → `process.env`(dev / build /
Node 测试)。畸形值会带日志回退地大声失败,而非当垃圾流过。完整表见
[README](README.zh-CN.md#配置);密钥**绝不**是 `vars`。

### 10.2 Cron

`triggers.crons: ["0 0 * * *"]` 驱动 `scheduled()` 处理器:**先备份后清理**
(使今天过期的链接仍为 `isDeleted=0` 而被快照到),每步各自 try/catch 隔离。
`backupToR2` 把活跃链接的 JSON 快照写入 R2(分页、封顶,R2 关闭时为空操作);
`cleanupExpiredLinks` 软删过期行并清除其 KV 缓存。

### 10.3 R2 可选

R2 支撑 Launchpad/OG/二维码 Logo 的资源上传与每日备份。绑定**默认注释掉**;
`isR2Enabled` 拦每个调用方,故 R2 缺失时上传返回 `503`、备份为空操作——核心短链
无它也能跑。

### 10.4 导入 / 导出

导出为 JSON(`version 1.0`,Sink 兼容的链接形状)或 CSV。导入是**非破坏性**的
(`importLinks`):活跃的 `(slug, domain)` 跳过,软删的复活,否则插入——配置
(含 `passwordHash`)与时间戳逐字保留。批量大小由 **D1 的 100 绑定参数上限**驱动
(`IMPORT_CHUNK=100`),载荷有界(1000 条),且 `passwordHash` 做形状校验
(`^[0-9a-f]{32}:[0-9a-f]{64}$`)。

### 10.5 迁移

由 `schema.ts` 经 drizzle-kit 生成。**迁移必须用 sqlite 方言(`DB_TYPE=d1`)**——
默认 libSQL 方言会产出 `ALTER COLUMN`,而 D1 拒绝它。用 `cf:localdb`(本地)/
`cf:remotedb`(远端 D1)应用。

### 10.6 部署

部署走 `deploy-flnk.yml` GitHub workflow(手动 dispatch):
`opennextjs-cloudflare build && deploy`,并从仓库密钥同步 `FLNK_` 前缀的密钥。
本地 `pnpm --filter @cdlab/flnk deploy` 可用但跳过密钥同步——优先用 workflow。
影响部署的改动(新密钥、迁移、构建步骤)必须反映到该 workflow 中。
