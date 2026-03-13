# @cdlab996/projects-monorepo

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A5%2010-f69220.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-cc00ff.svg)](https://turbo.build/)

现代 Web 工具集合 monorepo —— 基于 **Turborepo + pnpm**，涵盖 Next.js、Nuxt、Hono 等多技术栈

> [!IMPORTANT]
> 大多数应用**完全在浏览器端运行**，**零服务器上传**，数据永不离开你的设备。
> 隐私优先 · 本地优先 · 性能优先

## ✨ 应用详情

### Clearify

**图片 & 视频处理工具箱**

https://clearify.pages.dev/

- 一键移除背景、批量压缩（AVIF / WebP / JXL 等多种格式）、视频体积压缩（最高可达 90%）
- 核心技术：Transformers.js + WebGPU（背景移除）、FFmpeg.wasm（压缩 & 转码）
- 亮点：本地 WebGPU 加速、批量高效处理、完全无上传

<details>
  <summary>📸 Preview</summary>
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
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/og-image.png" alt="SecureC" />
</details>

### Dropply

**端到端加密的文件分享平台**

- 前后端分离架构：`dropply-web` 提供分享/管理界面，`dropply-api` 提供加密存储与链接管理
- 特点：临时链接、到期失效、加密后再上传，适合安全地分享敏感文件

<details>
  <summary>📸 Preview</summary>
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
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/og-image.png" alt="text2img" />
</details>

### byplay

**在线视频播放器 / Web Player 平台**

https://byplay.pages.dev/

- 支持 HLS、FLV、MP4 等多种格式的视频播放
- 提供更好的视频播放体验，可扩展监控与数据上报能力

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png" alt="byplay" />
</details>

### byplay-log

**ByPlay 播放器监控与分析服务**

- 为 ByPlay 提供播放数据采集、日志上报与行为分析能力
- 适合作为播放器日志后端或 A/B 实验/质量监控的数据基础设施

### m3u8-download

**M3U8 / HLS 视频下载助手**

https://m3u8dw.pages.dev/

- 解析 M3U8 链接、支持范围下载 / 流式下载 / AES-128 自动解密 / TS 转 MP4
- 核心技术：mux.js + Streams API
- 亮点：流式下载几乎零内存占用、支持暂停/续传/单片段重试

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/m3u8-download/og-image.png" alt="m3u8-download" />
</details>

### value-vision

**加密货币 / 法币 / 商品价值对比工具**

https://values.pages.dev/

- 将加密货币、法币与各类商品放在同一尺度下直观对比
- 亮点：输入资产或金额后，一眼看出"能买什么""价值相当于什么"

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png" alt="value-vision" />
</details>

### repo-changelog

**开源项目 Release / Changelog 聚合面板**

https://repo-changelog.vercel.app/

- 在一个仪表盘中跟踪多个 GitHub 仓库的 Release 与 Changelog
- 支持按仓库 / 用户 / 组织搜索，并按 Star、更新时间等排序

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/og-image.png" alt="repo-changelog" />
</details>

## 🚀 快速开始

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
pnpm dev                         # 启动所有应用（并行开发）
pnpm --filter clearify dev       # 只启动 Clearify
pnpm --filter m3u8-download dev
pnpm --filter securec dev
pnpm --filter text2img dev
pnpm --filter value-vision dev
pnpm --filter byplay dev
pnpm --filter byplay-log dev
pnpm --filter dropply-web dev
pnpm --filter repo-changelog dev
pnpm build                       # 构建所有应用
pnpm --filter clearify run build
pnpm --filter m3u8-download run build
pnpm --filter securec run build
pnpm --filter text2img run build
pnpm --filter value-vision run build
pnpm --filter byplay run build
pnpm --filter byplay-log run build
pnpm --filter dropply-web run build
pnpm --filter repo-changelog run build
pnpm lint                        # Biome 代码检查
pnpm format                      # Biome 格式化全部代码
pnpm clean                       # 清理 node_modules / 缓存 / 构建产物
```

## 📁 目录结构

```text
.
├── apps/
│   ├── byplay/            # 在线视频播放器 / Web Player
│   ├── byplay-log/        # ByPlay 播放器监控与分析服务
│   ├── clearify/          # 图像 & 视频工具箱
│   ├── dropply-api/       # Dropply 文件分享 Cloudflare API
│   ├── dropply-web/       # Dropply 文件分享 Web 前端
│   ├── m3u8-download/     # M3U8 下载工具
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

## 🛠 技术栈

| 层级           | 技术                                                           |
| -------------- | -------------------------------------------------------------- |
| **前端框架**   | React + Next.js 16+（App Router） / Vue 3 + Nuxt 4             |
| **类型系统**   | TypeScript 5                                                   |
| **UI**         | shadcn/ui · Tailwind CSS v4 · Nuxt UI                          |
| **浏览器能力** | WebAssembly (FFmpeg.wasm) · WebGPU · Web Workers · Streams API |
| **后端 / API** | Cloudflare Workers · Hono + Zod Validator                      |
| **数据库**     | Drizzle ORM + LibSQL / Cloudflare D1                           |
| **工程**       | Turborepo 2.x · pnpm 10 workspaces · Biome (Lint + Format)     |

## 📜 License

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
