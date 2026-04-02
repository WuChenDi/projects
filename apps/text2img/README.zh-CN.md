# 基于 CloudFlare 的在线文生图服务

[English](./README.md)

这是一个使用 Next.js 的文本生成图像服务，基于 Cloudflare AI Workers 的 AI 模型。免费使用，无需注册，即刻生成高质量 AI 图像。

预览：https://text2img.cdlab.workers.dev/

<details>
  <summary>预览</summary>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png" />
</details>

## 功能特性

- 支持多个 AI 图像生成模型（Stable Diffusion XL、FLUX.1、DreamShaper 等）
- 随机提示词功能
- 丰富的参数配置（尺寸、步数、引导系数、随机种子等）
- 深色 / 浅色主题切换
- 响应式设计，支持移动端
- 参数复制功能
- 图像一键下载

## 技术栈

- **框架**: Next.js 16
- **UI 库**: shadcn/ui + Tailwind CSS
- **状态管理**: TanStack Query (React Query)

## 开始使用

### 环境要求

- Node.js 20+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写以下配置：

```bash
PASSWORDS=
```

### 运行开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 部署

### 部署到 Cloudflare Pages

项目已配置 `@opennextjs/cloudflare`，可以部署到 Cloudflare Pages 或 Workers。

```bash
pnpm deploy
```

## 项目结构

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/
│   │   │   ├── models/
│   │   │   └── prompts/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   └── ui/
│   └── lib/
│       └── data.ts
└── public/
```

## 支持的模型

| 厂商 | 模型 | 状态 |
| --- | --- | --- |
| Black Forest Labs | FLUX.2 [klein] 9B | ✅ |
| Black Forest Labs | FLUX.2 [klein] 4B | ✅ |
| Black Forest Labs | FLUX.2 [dev] | ✅ |
| Black Forest Labs | FLUX.1 [schnell] | ✅ |
| Leonardo AI | Lucid Origin | 🚫 |
| Leonardo AI | Phoenix 1.0 | 🚫 |
| ByteDance | Stable Diffusion XL Lightning | ✅ |
| Lykon | DreamShaper 8 LCM | ✅ |
| Stability AI | Stable Diffusion XL Base 1.0 | ✅ |
| Runway ML | Stable Diffusion v1.5 img2img | 🚫 |
| Runway ML | Stable Diffusion v1.5 Inpainting | 🚫 |

## 📜 许可证

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
