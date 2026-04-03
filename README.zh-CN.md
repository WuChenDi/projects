# @cdlab996/projects-monorepo

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A5%2010-f69220.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-cc00ff.svg)](https://turbo.build/)

[English](./README.md)

现代 Web 工具集合 monorepo —— 基于 **Turborepo + pnpm**，涵盖 Next.js、Nuxt、Hono 等多技术栈

> [!IMPORTANT]
> 大多数应用**完全在浏览器端运行**，**零服务器上传**，数据永不离开你的设备。
> 隐私优先 · 本地优先 · 性能优先

## 应用详情

### Clearify

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

### SecureC

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

### Dropply

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

### text2img

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

### ByCut

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

### byplay

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

### byplay-log

**ByPlay 播放器监控与分析服务**

- 为 ByPlay 提供播放数据采集、日志上报与行为分析能力
- 适合作为播放器日志后端或 A/B 实验/质量监控的数据基础设施

### vidl

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

### value-vision

**加密货币 / 法币 / 商品价值对比工具**

https://values.pages.dev/

- 将加密货币、法币与各类商品放在同一尺度下直观对比
- 亮点：输入资产或金额后，一眼看出"能买什么""价值相当于什么"

<details>
  <summary>预览</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png" alt="value-vision" />
</details>

### LiveUser

**实时在线用户计数器**

https://live-user.chendi.workers.dev/

- 嵌入一行 script 标签，即可在任意网页上显示实时在线人数与总访问量
- WebSocket Hibernation API —— Durable Object 空闲时自动休眠，最大程度降低成本
- 访问量存储在 DO 内嵌 SQLite 中，原子更新，高并发下不丢数据
- 核心技术：Hono + Cloudflare Workers + Durable Objects + SQLite

### repo-changelog

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

```bash
pnpm dev                           # 启动所有应用（并行开发）
pnpm --filter clearify dev         # 只启动 Clearify
pnpm --filter @cdlab996/bycut dev  # 只启动 ByCut (port 3020)
pnpm --filter vidl dev             # 只启动 vidl (port 3010)
pnpm --filter securec dev          # 只启动 SecureC (port 3009)
pnpm --filter text2img dev         # 只启动 Text2Img (port 3012)
pnpm --filter value-vision dev     # 只启动 Value Vision (port 3011)
pnpm --filter byplay dev           # 只启动 ByPlay (port 3016)
pnpm --filter byplay-log dev       # 只启动 ByPlay Log (port 3017)
pnpm --filter dropply-web dev      # 只启动 Dropply Web (port 3013)
pnpm --filter @cdlab996/live-user dev  # 只启动 LiveUser (port 3021)
pnpm --filter repo-changelog dev   # 只启动 Repo Changelog (port 3019)
pnpm build                         # 构建所有应用
pnpm --filter clearify run build
pnpm --filter @cdlab996/bycut run build
pnpm --filter vidl run build
pnpm --filter securec run build
pnpm --filter text2img run build
pnpm --filter value-vision run build
pnpm --filter byplay run build
pnpm --filter byplay-log run build
pnpm --filter dropply-web run build
pnpm --filter repo-changelog run build
pnpm lint                          # Biome 代码检查
pnpm format                        # Biome 格式化全部代码
pnpm clean                         # 清理 node_modules / 缓存 / 构建产物
```

## 目录结构

```text
.
├── apps/
│   ├── bycut/             # 浏览器端视频编辑器
│   ├── byplay/            # 在线视频播放器
│   ├── byplay-log/        # ByPlay 播放器监控与分析服务
│   ├── clearify/          # 图像 & 视频工具箱
│   ├── dropply-api/       # Dropply 文件分享 Cloudflare API
│   ├── dropply-web/       # Dropply 文件分享 Web 前端
│   ├── live-user/         # 实时在线用户计数器
│   ├── vidl/              # 视频下载工具（M3U8/HLS、MP4 等）
│   ├── repo-changelog/    # GitHub Release / Changelog 聚合工具
│   ├── SecureC/           # 加解密工具
│   ├── text2img/          # 文生图前端
│   └── value-vision/      # 价值对比 / 可视化工具
├── packages/
│   ├── tsconfig/          # 共享 TypeScript 配置 (@cdlab996/tsconfig)
│   ├── ui/                # 共享 UI 组件库 (@cdlab996/ui)
│   ├── uncrypto/          # 轻量加密库 (@cdlab996/uncrypto)
│   └── utils/             # 通用工具函数 (@cdlab996/utils)
├── scripts/
│   └── clean.sh
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## 技术栈

| 层级           | 技术                                                           |
| -------------- | -------------------------------------------------------------- |
| **前端框架**   | React + Next.js 16+（App Router） / Vue 3 + Nuxt 4             |
| **类型系统**   | TypeScript 5                                                   |
| **UI**         | shadcn/ui · Tailwind CSS v4 · Nuxt UI                          |
| **浏览器能力** | WebAssembly (FFmpeg.wasm) · WebGPU · Web Workers · Streams API |
| **后端 / API** | Cloudflare Workers · Hono + Zod Validator                      |
| **数据库**     | Drizzle ORM + LibSQL / Cloudflare D1                           |
| **工程**       | Turborepo 2.x · pnpm 10 workspaces · Biome (Lint + Format)     |

## 许可证

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
