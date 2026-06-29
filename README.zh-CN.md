# @cdlab996/projects-monorepo

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A5%2010-f69220.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-cc00ff.svg)](https://turbo.build/)
[![NSL](https://img.shields.io/badge/dev%20proxy-%40dotns%2Fnsl-4a9eff.svg)](https://github.com/dotns/nsl)

[English](./README.md) | [中文](./README.zh-CN.md)

现代 Web 工具集合 monorepo —— 基于 **Turborepo + pnpm**，涵盖 Next.js、Nuxt、Hono 等多技术栈。本地开发通过 [@dotns/nsl](https://github.com/dotns/nsl) 反向代理，每个应用都有固定的访问地址 `http://<name>.localhost:3355`，无需记忆端口号。

> [!IMPORTANT]
> 大多数应用**完全在浏览器端运行**，**零服务器上传**，数据永不离开你的设备。
> 隐私优先 · 本地优先 · 性能优先

## 应用详情

### [Clearify](./apps/clearify)

**图片 & 视频处理工具箱**

https://clearify.pages.dev/

- 一键移除背景、批量压缩（AVIF / WebP / JXL 等多种格式）、视频体积压缩（最高可达 90%）
- 核心技术：Transformers.js + WebGPU（背景移除）、FFmpeg.wasm（压缩 & 转码）
- 亮点：本地 WebGPU 加速、批量高效处理、完全无上传

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/og-image.png" alt="Clearify" />
</details>

### [SecureC](./apps/SecureC)

**客户端文件 / 文本加解密工具**

https://securec.pages.dev/

- XChaCha20-Poly1305 加密、Argon2id 密码派生、ECIES 公钥加密、大文件分块处理
- 核心技术：@noble/ciphers + Web Workers
- 亮点：10 MB 分块 + Web Worker 后台处理，UI 始终流畅

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/og-image.png" alt="SecureC" />
</details>

### [Dropply](./apps/dropply-web)

**端到端加密的文件分享平台**

https://dropply.pages.dev/

- 客户端 AES-GCM + Argon2id 加密，密钥仅通过 URL fragment 传递，服务端从不接触明文
- Tab 式分享/取件界面；大文件 Multipart 上传（20 MB 分块，3 并发）；可配置有效期；可选 TOTP 验证门控；邮件分享；国际化（中/英）
- 前后端分离架构：`dropply-web`（Next.js + Cloudflare Pages）+ `dropply-api`（Cloudflare Workers）

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/og-image.png" alt="Dropply" />
</details>

### [text2img](./apps/text2img)

**浏览器端文本生成图像**

https://text2img.cdlab.workers.dev/

- 支持 FLUX、SDXL、DreamShaper 等模型，随机提示词、丰富参数调节
- 核心技术：Next.js App Router + TanStack Query + Cloudflare AI
- 亮点：实时预览、深色/浅色主题、一键下载

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/og-image.png" alt="text2img" />
</details>

### [ByCut](./apps/bycut)

**浏览器端视频编辑器**

https://bycut.pages.dev/

- 完全客户端运行的开源视频编辑器（CapCut 替代方案）—— 零服务器上传，完全隐私
- 多轨道时间线编辑、时间线书签、AI 字幕生成、文字转语音、贴纸、转场、关键帧动画
- 核心技术：Next.js（App Router，静态导出）+ Zustand + FFmpeg.wasm + Hugging Face Transformers + WaveSurfer.js + next-intl（中/英）
- 亮点：GPU 加速画布渲染、完整的撤销/重做命令系统、自定义键盘快捷键

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bycut/og-image.png" alt="ByCut" />
</details>

### [byplay](./apps/byplay)

**在线视频播放器**

https://byplay.pages.dev/

- 支持 HLS（M3U8 多码率自适应）、MP4、WebM、OGG 等多种格式的视频播放
- HLS 流支持画质切换、ABR 自适应码率、缓冲区 & 重试策略配置
- 一键跳转 [vidl](https://vidl.pages.dev/) 下载当前视频
- 可扩展监控与数据上报能力

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png" alt="byplay" />
</details>

### [byplay-log](./apps/byplay-log)

**ByPlay 播放器监控与分析服务**

- 为 ByPlay 提供播放数据采集、日志上报与行为分析能力
- 适合作为播放器日志后端或 A/B 实验/质量监控的数据基础设施

### [byTTS](./apps/bytts)

**浏览器端文字转语音工具**

https://bytts.pages.dev/

- 调用 Microsoft Azure 认知服务将文字合成语音，支持语音级联选择、语速与音调调节
- 基于 SSML 合成、流式音频输出，可配置客户端 Trace ID
- 核心技术：Next.js（App Router）· Radix UI · Edge Runtime · Microsoft Azure Speech Service

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bytts/og-image.png" alt="bytts" />
</details>

### [byshot](./apps/byshot)

**个人摄影作品集**

https://byshot.pages.dev/

- 基于 Cloudinary 的图片画廊，瀑布流响应式布局（1 / 2 / 3 / 4 列）
- 全屏灯箱，支持键盘导航（`←` / `→` / `Esc`）、触屏滑动与过渡动画
- 模糊占位图：Cloudinary 极小 JPEG 转 base64 data URL 内联，瞬时呈现感
- 深度链接：`/p/[photoId]` 单图轮播路由 + `/?photoId=N` 网格内模态切换；自动恢复上次查看位置
- 核心技术：Next.js 16（App Router、RSC）+ Cloudinary Node SDK + motion + Zustand + Tailwind CSS v4

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/image-gallery/index.png" alt="byshot" />
</details>

### [vidl](./apps/vidl)

**在线视频下载工具**

https://vidl.pages.dev/

- 支持 M3U8/HLS、MP4、WebM、MKV、FLV 等格式，自动检测 URL 格式
- M3U8：范围下载、流式下载、AES-128 解密、TS 转 MP4
- 一键跳转 [byplay](https://byplay.pages.dev/) 预览播放当前视频
- 核心技术：mux.js + Streams API
- 亮点：近零内存流式下载、暂停/恢复、指数退避自动重试

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/vidl/og-image.png" alt="vidl" />
</details>

### [value-vision](./apps/value-vision)

**加密货币 / 法币 / 商品价值对比工具**

https://values.pages.dev/

- 将加密货币、法币与各类商品放在同一尺度下直观对比
- 亮点：输入资产或金额后，一眼看出"能买什么""价值相当于什么"

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png" alt="value-vision" />
</details>

### [Baccarat](./apps/baccarat)

**Telegram 百家乐游戏机器人**

- 完整的百家乐游戏逻辑，含下注、骰子发牌与自动结算
- 自动游戏模式，可配置局间间隔，每个群组通过 Durable Objects 独立维护游戏状态
- 游戏历史记录通过 Durable Objects SQLite 持久化存储
- 核心技术：Hono + Grammy + Cloudflare Workers + Durable Objects

### [Flox](./apps/flox)

**视频聚合与播放平台**

https://floxx.pages.dev/

- 多源并行视频搜索，实时流式返回结果（SSE），内置 38+ 视频源
- HLS/M3U8 播放，支持广告过滤（关键词、启发式、SCTE-35）、代理模式、自动下一集
- Service Worker 缓存、观看历史、收藏夹、密码保护、Premium 模式隔离
- 核心技术：Next.js 16（App Router）+ React 19 + Zustand + HLS.js + Volcengine VePlayer + Tailwind CSS 4

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flox/og-image.png" alt="flox" />
</details>

### [LiveUser](./apps/live-user)

**实时在线用户计数器**

https://live-user.cdlab.workers.dev/

- 嵌入一行 script 标签，即可在任意网页上显示实时在线人数与总访问量
- WebSocket Hibernation API —— Durable Object 空闲时自动休眠，最大程度降低成本
- 访问量存储在 DO 内嵌 SQLite 中，原子更新，高并发下不丢数据
- 核心技术：Hono + Cloudflare Workers + Durable Objects + SQLite

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/live-user/index.png" alt="live-user" />
</details>

### [wepush](./apps/wepush)

**微信测试号模板消息推送控制台**

https://wepush.cdlab.workers.dev/

- 在 Web 控制台中管理收件人、模板、定时推送，并查看持久化推送日志，完全替代旧版 `ALL_CONFIG` + 青龙脚本方案
- 收件人支持城市、节日、纪念日、农历日期；内置 CMA 气象站编码城市选择器（3240 条）
- 模板编辑器支持结构实时预览，可针对任意收件人渲染真实数据预览，`{{var.DATA}}` 变量一键插入
- 推送触发方式：界面手动（单条 / 批量）、HTTP API（`Bearer <pushApiToken>` 鉴权）、Worker `scheduled()` Cron —— Cron 可在设置页暂停，无需重新部署
- 持久化推送日志，支持批次分组、状态过滤、请求载荷快照与一键重试
- 核心技术：Next.js 16（App Router）+ React 19 + Drizzle（LibSQL / D1）+ TanStack Query/Form + Zustand + tyme4ts（公历/农历）+ @opennextjs/cloudflare → Cloudflare Workers（含 Cron 触发器）

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/wepush/og-image.png" alt="wepush" />
</details>

### [Flnk](./apps/flnk)

**隐私优先短链服务**

https://flnk.cdlab.workers.dev/

- 边缘跳转引擎（KV 缓存 → D1 兜底 → 回填缓存），状态码可配置，支持按链接过期清理
- 基于 `cf.country` 的地域路由，以及面向 Apple / Android UA 的设备路由，支持查询参数透传
- 链接保护：密码门（Argon2id）、不安全跳转中间页、社交爬虫 OG HTML 与链接伪装
- 经 Cloudflare Analytics Engine 的隐私友好分析 —— 跳转路径上无追踪 Cookie
- 后台支持 AI slug 生成、多域名、导出 / 导入 / 备份；社交登录基于 better-auth（Google + GitHub）
- 核心技术：Next.js 16（App Router）+ React 19 + Drizzle（LibSQL / D1）+ better-auth + Workers AI + @opennextjs/cloudflare → Cloudflare Workers（含 Cron 清理）

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flnk/index.png" alt="Flnk" />
</details>

### [repo-changelog](./apps/repo-changelog)

**开源项目 Release / Changelog 聚合面板**

https://repo-changelog.vercel.app/

- 在一个仪表盘中跟踪多个 GitHub 仓库的 Release 与 Changelog
- 支持按仓库 / 用户 / 组织搜索，并按 Star、更新时间等排序

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/og-image.png" alt="repo-changelog" />
</details>

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 10

### 克隆 & 安装

```bash
git clone https://github.com/WuChenDi/projects.git
cd projects
pnpm install
```

### 常用命令

开发服务器通过 [@dotns/nsl](https://github.com/dotns/nsl) 代理，每个应用均可通过 `http://<name>.localhost:3355` 访问（name 为去掉 scope 后的包名）。

```bash
pnpm dev                                     # 启动所有应用（并行开发）
pnpm --filter @cdlab996/clearify dev         # → http://clearify.localhost:3355
pnpm --filter @cdlab996/baccarat dev         # → http://baccarat.localhost:3355
pnpm --filter @cdlab996/bycut dev            # → http://bycut.localhost:3355
pnpm --filter @cdlab996/vidl dev             # → http://vidl.localhost:3355
pnpm --filter @cdlab996/securec dev          # → http://securec.localhost:3355
pnpm --filter @cdlab996/text2img dev         # → http://text2img.localhost:3355
pnpm --filter @cdlab996/values dev           # → http://values.localhost:3355
pnpm --filter @cdlab996/byplay dev           # → http://byplay.localhost:3355
pnpm --filter @cdlab996/byplay-log dev       # → http://byplay-log.localhost:3355
pnpm --filter @cdlab996/bytts dev            # → http://bytts.localhost:3355
pnpm --filter @cdlab996/byshot dev           # → http://byshot.localhost:3355
pnpm --filter @cdlab996/dropply-web dev      # → http://dropply-web.localhost:3355
pnpm --filter @cdlab996/flox dev             # → http://flox.localhost:3355
pnpm --filter @cdlab996/live-user dev        # → http://live-user.localhost:3355
pnpm --filter @cdlab996/flnk dev             # → http://flnk.localhost:3355
pnpm --filter @cdlab996/wepush dev           # → http://wepush.localhost:3355
pnpm --filter @cdlab996/repo-changelog dev   # → http://repo-changelog.localhost:3355
pnpm build                                   # 构建所有应用
pnpm --filter @cdlab996/clearify run build
pnpm --filter @cdlab996/bycut run build
pnpm --filter @cdlab996/vidl run build
pnpm --filter @cdlab996/securec run build
pnpm --filter @cdlab996/text2img run build
pnpm --filter @cdlab996/values run build
pnpm --filter @cdlab996/byplay run build
pnpm --filter @cdlab996/byplay-log run build
pnpm --filter @cdlab996/bytts run build
pnpm --filter @cdlab996/byshot run build
pnpm --filter @cdlab996/dropply-web run build
pnpm --filter @cdlab996/flox run build
pnpm --filter @cdlab996/flnk run build
pnpm --filter @cdlab996/wepush run build
pnpm --filter @cdlab996/repo-changelog run build
pnpm lint                          # Biome 代码检查
pnpm format                        # Biome 格式化全部代码
pnpm clean                         # 清理 node_modules / 缓存 / 构建产物
```

## 目录结构

```text
.
├── apps/
│   ├── baccarat/          # Telegram 百家乐游戏机器人
│   ├── bycut/             # 浏览器端视频编辑器
│   ├── byplay/            # 在线视频播放器
│   ├── byplay-log/        # ByPlay 播放器监控与分析服务
│   ├── byshot/            # 个人摄影作品集（Cloudinary）
│   ├── bytts/             # 文字转语音工具
│   ├── clearify/          # 图像 & 视频工具箱
│   ├── dropply-api/       # Dropply 文件分享 Cloudflare API
│   ├── dropply-web/       # Dropply 文件分享 Web 前端
│   ├── flox/              # Flox - 视频聚合与播放平台
│   ├── live-user/         # 实时在线用户计数器
│   ├── repo-changelog/    # GitHub Release / Changelog 聚合工具
│   ├── SecureC/           # 加解密工具
│   ├── flnk/              # 隐私优先短链服务（Next.js + Cloudflare Workers）
│   ├── text2img/          # 文生图前端
│   ├── value-vision/      # 价值对比 / 可视化工具
│   ├── vidl/              # 视频下载工具（M3U8/HLS、MP4 等）
│   └── wepush/            # 微信测试号模板消息推送控制台
├── packages/
│   ├── cipher/            # 流式加解密库 (@cdlab996/cipher)
│   ├── tsconfig/          # 共享 TypeScript 配置 (@cdlab996/tsconfig)
│   ├── ui/                # 共享 UI 组件库 (@cdlab996/ui)
│   ├── uncrypto/          # 轻量加密工具 (@cdlab996/uncrypto)
│   └── utils/             # 通用工具函数 (@cdlab996/utils)
├── scripts/
│   └── clean.sh
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## 技术栈

| 层级           | 技术                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| **前端框架**   | React + Next.js 16+（App Router） / Vue 3 + Nuxt 4                                      |
| **类型系统**   | TypeScript 5                                                                            |
| **UI**         | shadcn/ui · Tailwind CSS v4 · Nuxt UI                                                   |
| **浏览器能力** | WebAssembly (FFmpeg.wasm) · WebGPU · Web Workers · Streams API                          |
| **后端 / API** | Cloudflare Workers · Hono + Zod Validator                                               |
| **数据库**     | Drizzle ORM + LibSQL / Cloudflare D1                                                    |
| **工程**       | Turborepo 2.x · pnpm 10 workspaces · Biome (Lint + Format) · @dotns/nsl（本地开发代理） |

## 许可证

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
