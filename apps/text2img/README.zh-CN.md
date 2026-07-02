# text2img

[English](./README.md) | [中文](./README.zh-CN.md)

免费、无需注册的 AI 文生图工具——输入提示词、选择模型即可生成图像。基于 **Next.js (App Router)** 与 **Cloudflare Workers AI** 构建，通过 [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) 部署。

预览：https://text2img.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/og-image.png)

## 功能特性

- **多模型生成**（`src/app/api/generate/route.ts`）——根据模型分组将请求路由到对应的 Workers AI 绑定与入参结构
  - **Black Forest Labs FLUX**（FLUX.2 klein/dev、FLUX.1 schnell）、**Stability AI** Stable Diffusion XL、**ByteDance** SDXL Lightning、**Lykon** DreamShaper——完整、实时的启用状态见下方模型列表
  - 每个模型分组都有独立的 `prepareInputs` / `processResponse` 适配器，统一处理 prompt、尺寸、步数、guidance、seed，以及（FLUX 专属的）不同响应格式解析
- **随机提示词库**（`GET /api/prompts`）——一键填充随机提示词
- **模型目录**（`GET /api/models`）——模型列表及厂商/分组元数据，数据来自 `src/lib/data.ts`
- **丰富的参数配置**——尺寸、步数、strength、guidance scale、seed 均可按次生成调整
- **生成历史**——生成结果（含进行中/失败）由 Zustand store（`src/store/useImageStore.ts`）跟踪；已完成的图像 blob 持久化在 IndexedDB（`src/lib/storage.ts`）中，元数据持久化到 `localStorage`，因此刷新页面后历史依然保留，且密码与源图片字节永远不会被存储
- **可选密码保护**——设置 `PASSWORDS` 后，客户端会先对密码做 Argon2id 哈希再发送，服务端只校验哈希值，明文密码不会经过网络
- **深色 / 浅色主题切换**
- **图像一键下载**

## 技术栈

- **框架** —— Next.js (App Router)、React、TypeScript
- **UI** —— shadcn/ui（`@cdlab996/ui`）+ Tailwind CSS
- **数据请求 / 变更** —— TanStack Query（模型/提示词用 `useQuery`，生成用 `useMutation`）
- **状态管理** —— Zustand（`useImageStore`，持久化）
- **平台** —— Cloudflare Workers AI（`AI` 绑定），通过 OpenNext 部署
- **国际化** —— next-intl（en / zh）

## 开始使用

### 环境要求

- Node.js 20+
- pnpm

### 安装

```bash
pnpm install
```

### 开发

```bash
pnpm --filter @cdlab996/text2img dev
```

通过 `@dotns/nsl` 提供服务，地址为 `http://text2img.localhost:3355`，无需手动分配端口。

### 配置

将 `.env.example` 复制为 `.env.local`：

```bash
PASSWORDS=
```

`PASSWORDS` 是逗号分隔的密码列表，用于保护生成接口；留空则关闭密码保护。

### 构建 / 部署

使用 `@opennextjs/cloudflare` 构建，而非原生 Next.js 构建。

```bash
pnpm --filter @cdlab996/text2img deploy
```

需要 Cloudflare Workers AI（`AI`）绑定，详见 `wrangler.jsonc`。

## 支持的模型

| 厂商 | 模型 | 状态 |
| --- | --- | --- |
| Black Forest Labs | FLUX.2 [klein] 9B | 已启用 |
| Black Forest Labs | FLUX.2 [klein] 4B | 已启用 |
| Black Forest Labs | FLUX.2 [dev] | 已启用 |
| Black Forest Labs | FLUX.1 [schnell] | 已启用 |
| Leonardo AI | Lucid Origin | 已禁用 |
| Leonardo AI | Phoenix 1.0 | 已禁用 |
| ByteDance | Stable Diffusion XL Lightning | 已启用 |
| Lykon | DreamShaper 8 LCM | 已启用 |
| Stability AI | Stable Diffusion XL Base 1.0 | 已启用 |
| Runway ML | Stable Diffusion v1.5 img2img | 已禁用 |
| Runway ML | Stable Diffusion v1.5 Inpainting | 已禁用 |

禁用的模型定义在 `src/lib/data.ts` 中，`/api/generate` 会在请求时拒绝这些模型。

## 许可证

[MIT](../../LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
