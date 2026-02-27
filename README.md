# @cdlab996/projects-monorepo

现代浏览器本地工具集合 monorepo  
基于 **Turborepo + pnpm + Next.js + shadcn/ui + Tailwind CSS**

> [!IMPORTANT]
> 所有应用**完全在浏览器端运行**，**零服务器上传**，数据永不离开你的设备。  
> 隐私优先 · 本地优先 · 性能优先

## ✨ 当前应用

### Clearify

**图片 & 视频处理工具箱**

- 一键移除背景、批量压缩（AVIF / WebP / JXL 等多种格式）、视频体积压缩（最高可达 90%）
- 核心技术：Transformers.js + WebGPU（背景移除）、FFmpeg.wasm（压缩 & 转码）
- 亮点：本地 WebGPU 加速、批量高效处理、完全无上传

<details>
  <summary>📸 预览（点击展开）</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/index.png" alt="Clearify 主界面" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/bg-pages.png" alt="背景移除页面" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/squish-pages.png" alt="批量压缩页面" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/compress-pages.png" alt="视频压缩页面" />
</details>

### m3u8-download

**M3U8 / HLS 视频下载助手**

- 解析 M3U8 链接、支持范围下载 / 流式下载 / AES-128 自动解密 / TS 转 MP4
- 核心技术：mux.js + Streams API
- 亮点：流式下载几乎零内存占用、支持暂停/续传/单片段重试

<details>
  <summary>📸 预览 & 在线演示（点击展开）</summary>
  <br/>
  <p>在线体验：https://m3u8dw.pages.dev/</p>
  <!-- 如果后续补充截图，可在此添加 -->
  <!-- <img src="..." alt="m3u8-download 主界面" /> -->
</details>

### SecureC

**客户端文件 / 文本加解密工具**

- XChaCha20-Poly1305 加密、Argon2id 密码派生、ECIES 公钥加密、大文件分块处理
- 核心技术：@noble/ciphers + Web Workers
- 亮点：10MB 分块 + Web Worker 后台处理，UI 始终流畅

<details>
  <summary>📸 预览（点击展开）</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/index.png" alt="SecureC 主界面" />
</details>

### text2img

**浏览器端文本生成图像**

- 支持 FLUX、SDXL、DreamShaper 等模型，随机提示词、丰富参数调节
- 核心技术：Next.js App Router + TanStack Query + Cloudflare AI
- 亮点：实时预览、深色/浅色主题、一键下载

<details>
  <summary>📸 预览（点击展开）</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png" alt="text2img 主界面" />
</details>

### value-vision

**加密货币 / 法币 / 商品价值对比工具**

- 将加密货币、法币与各类商品放在同一尺度下直观对比
- 亮点：输入资产或金额后，一眼看出“能买什么”“价值相当于什么”

<details>
  <summary>📸 预览（点击展开）</summary>
  <br/>
  <p>在线体验：https://values.pages.dev/</p>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png" alt="value-vision 主界面" />
</details>

## 🚀 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 10（推荐使用 corepack 管理）

```bash
# 推荐：启用 corepack（现代 pnpm 最佳实践）
corepack enable
corepack prepare pnpm@10 --activate
```

### 克隆 & 安装

```bash
git clone https://github.com/WuChenDi/projects.git
cd projects
pnpm install
```

### 常用命令（根目录执行）

```bash
pnpm dev                       # 启动所有应用（并行开发）
pnpm --filter clearify dev     # 只启动 Clearify
pnpm --filter m3u8-download dev
pnpm --filter securec dev
pnpm --filter text2img dev
pnpm --filter value-vision dev
pnpm build                     # 构建所有应用
pnpm lint                      # Biome 代码检查
pnpm format                    # Biome 格式化全部代码
pnpm clean                     # 清理 node_modules / 缓存 / 构建产物
```

## 目录结构

```text
.
├── apps/
│   ├── clearify/         # 图像 & 视频工具箱
│   ├── m3u8-download/    # M3U8 下载工具
│   ├── securec/          # 加解密工具
│   ├── text2img/         # 文生图前端
│   └── value-vision/     # 价值对比 / 可视化工具
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
