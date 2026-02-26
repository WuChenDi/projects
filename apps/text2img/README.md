# 基于 CloudFlare 的在线文生图服务

这是一个使用 Next.js 的文本生成图像服务，基于 Cloudflare AI Workers 的 AI 模型。

## Preview

![Preview](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png)

## 功能特性

- 🎨 支持多个 AI 图像生成模型（Stable Diffusion XL、FLUX、DreamShaper 等）
- 🎲 随机提示词功能
- ⚙️ 丰富的参数配置（尺寸、步数、引导系数、随机种子等）
- 🌓 深色/浅色主题切换
- 📱 响应式设计，支持移动端
- 📋 参数复制功能
- 💾 图像下载功能

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
# 构建并部署到 Cloudflare
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

- Stable Diffusion XL Base 1.0
- FLUX.1 [schnell]
- DreamShaper 8 LCM
- Stable Diffusion XL Lightning

## 📜 License

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
