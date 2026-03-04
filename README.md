# @cdlab996/projects-monorepo

现代浏览器本地工具集合 monorepo  
基于 **Turborepo + pnpm + Next.js + shadcn/ui + Tailwind CSS**

> [!IMPORTANT]
> 所有应用**完全在浏览器端运行**，**零服务器上传**，数据永不离开你的设备。  
> 隐私优先 · 本地优先 · 性能优先

## ✨ 当前应用

### Clearify

**图片 & 视频处理工具箱**

https://clearify.pages.dev/

- 一键移除背景、批量压缩（AVIF / WebP / JXL 等多种格式）、视频体积压缩（最高可达 90%）
- 核心技术：Transformers.js + WebGPU（背景移除）、FFmpeg.wasm（压缩 & 转码）
- 亮点：本地 WebGPU 加速、批量高效处理、完全无上传

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/index.png" alt="Clearify 主界面" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/bg-pages.png" alt="背景移除页面" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/squish-pages.png" alt="批量压缩页面" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/compress-pages.png" alt="视频压缩页面" />
</details>

### SecureC

**客户端文件 / 文本加解密工具**

https://securec.pages.dev/

- XChaCha20-Poly1305 加密、Argon2id 密码派生、ECIES 公钥加密、大文件分块处理
- 核心技术：@noble/ciphers + Web Workers
- 亮点：10MB 分块 + Web Worker 后台处理，UI 始终流畅

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/index.png" alt="SecureC 主界面" />
</details>

### Dropply

**端到端加密的文件分享平台**

- 基于 Next.js + Cloudflare Workers 构建，前后端分离：`dropply-web` 提供分享/管理界面，`dropply-api` 提供加密存储与链接管理
- 特点：临时链接、到期失效、加密后再上传，适合安全地分享敏感文件

### text2img

**浏览器端文本生成图像**

https://text2img.cdlab.workers.dev/

- 支持 FLUX、SDXL、DreamShaper 等模型，随机提示词、丰富参数调节
- 核心技术：Next.js App Router + TanStack Query + Cloudflare AI
- 亮点：实时预览、深色/浅色主题、一键下载

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png" alt="text2img 主界面" />
</details>

### byplay

**在线视频播放器 / Web Player 平台**

https://byplay.pages.dev/

- 支持 HLS、FLV、MP4 等多种格式的视频播放
- 提供更好的视频播放体验，可扩展监控与数据上报能力

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png" alt="byplay 主界面" />
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
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/m3u8-download/index.png" alt="m3u8-download 主界面" />
</details>

### value-vision

**加密货币 / 法币 / 商品价值对比工具**

https://values.pages.dev/

- 将加密货币、法币与各类商品放在同一尺度下直观对比
- 亮点：输入资产或金额后，一眼看出“能买什么”“价值相当于什么”

<details>
  <summary>📸 Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png" alt="value-vision 主界面" />
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
pnpm dev                       # 启动所有应用（并行开发）
pnpm --filter clearify dev     # 只启动 Clearify
pnpm --filter m3u8-download dev
pnpm --filter securec dev
pnpm --filter text2img dev
pnpm --filter values dev
pnpm --filter byplay dev
pnpm --filter byplay-log dev
pnpm --filter dropply-web dev
pnpm build                     # 构建所有应用
pnpm lint                      # Biome 代码检查
pnpm format                    # Biome 格式化全部代码
pnpm clean                     # 清理 node_modules / 缓存 / 构建产物
```

## 目录结构

```text
.
├── apps/
│   ├── clearify/          # 图像 & 视频工具箱
│   ├── m3u8-download/     # M3U8 下载工具
│   ├── securec/           # 加解密工具
│   ├── text2img/          # 文生图前端
│   ├── value-vision/      # 价值对比 / 可视化工具
│   ├── byplay/            # 在线视频播放器 / Web Player
│   ├── byplay-log/        # ByPlay 播放器监控与分析服务
│   ├── dropply-web/       # Dropply 文件分享 Web 前端
│   └── dropply-api/       # Dropply 文件分享 Cloudflare API
├── packages/
│   └── tsconfig/         # 共享 TypeScript 配置 (@cdlab996/tsconfig)
├── scripts/
│   └── clean.sh
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## 技术栈

- **框架**：Next.js 16+ (App Router)
- **UI**：shadcn/ui + Tailwind CSS v4
- **构建 & 缓存**：Turborepo 2.x
- **包管理**：pnpm 10 workspaces
- **代码质量**：Biome (linter + formatter)

## 📜 License

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
