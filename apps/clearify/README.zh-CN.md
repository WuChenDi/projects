# Clearify

[English](./README.md) | [中文](./README.zh-CN.md)

基于浏览器的图片与视频工具箱——背景移除、批量图片压缩、视频压缩，全部本地处理，不上传服务器。

预览：https://clearify.pages.dev/

<details>
  <summary>预览</summary>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/index.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/bg-pages.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/squish-pages.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/compress-pages.png" />
</details>

## 功能特性

- **背景移除**（`/bg`）
  - 通过 Transformers.js 一键移除背景，可选 WebGPU 加速
  - 用纯色或自定义图片替换背景
  - 导出透明背景或填充背景
  - 完全在浏览器中运行——无需上传，注重隐私

  > **模型：**
  >
  > - [MODNet (WebGPU)](https://huggingface.co/wuchendi/MODNet)
  > - [RMBG-2.0 (WASM)](https://huggingface.co/briaai/RMBG-2.0)
  > - [RMBG-1.4 (WASM)](https://huggingface.co/briaai/RMBG-1.4)
  >
  > 由 [Transformers.js](https://www.npmjs.com/package/@huggingface/transformers) 驱动

- **Squish —— 批量图片压缩**（`/compress`）
  - 通过 jSquash（WebAssembly）在浏览器中批量压缩多张图片
  - 支持 AVIF、JPEG、JXL、PNG、WebP
  - 可调节质量（1-100%）
  - 支持拖拽或粘贴输入；支持单张或批量下载
  - 仅本地处理——无需上传

- **视频压缩器**（`/squish`）
  - 通过 FFmpeg.wasm 在浏览器中压缩视频，最高可压缩 90%
  - 多种压缩模式：CRF、码率、百分比、目标文件大小
  - 可自定义视频/音频设置——H.264/H.265 视频编码，AAC/MP3 音频编码
  - 实时进度可视化
  - 仅本地处理——无需上传

## 技术栈

- **框架** — Next.js（App Router）、React、TypeScript
- **背景移除** — Transformers.js、WebGPU（可选）、WebAssembly 回退
- **图片压缩** — jSquash（`@jsquash/avif`、`@jsquash/jpeg`、`@jsquash/jxl`、`@jsquash/png`、`@jsquash/webp`）
- **视频压缩** — FFmpeg.wasm、`mediabunny`
- **状态管理** — Zustand
- **部署平台** — Cloudflare Pages，通过 `@cloudflare/next-on-pages`

## 快速开始

### 前置条件

- Node.js 与 pnpm（由工作区统一管理——参见 monorepo 根目录 `README.md`）

### 安装

```bash
# 在 monorepo 根目录执行
pnpm install
```

### 开发

```bash
# 通过 nsl 在 http://clearify.localhost:3355 启动开发服务器
pnpm --filter @cdlab/clearify dev
```

### 构建 / 部署

```bash
# 生产构建（此处不使用 Turbopack —— wasm 与 worker 混合场景需要 webpack）
pnpm --filter @cdlab/clearify build

# 构建 Cloudflare Pages 产物
pnpm --filter @cdlab/clearify build:cf
```

## 架构

- `src/app/bg`、`src/app/compress`、`src/app/squish` —— 每种模式对应一个路由，无多语言路由
- `src/lib/wasm.ts` —— 按需求的输出格式懒加载对应的 jSquash WASM 模块
- `src/lib/imageProcessing.ts`、`src/lib/process.ts` —— 处理管线：解码 → 变换 → 编码，通过 `jszip` 支持批量 ZIP 输出
- `src/lib/canvas.ts` —— 基于 canvas 的缩放与合成
- `src/components/pages/{bg,compress,squish}` —— 每种模式一个子目录，与路由结构一一对应

## 浏览器支持

- **默认体验** — 所有现代浏览器（Chrome、Firefox、Safari、Edge）
- **增强体验** — 支持 `WebGPU` 的浏览器可获得更佳体验

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
