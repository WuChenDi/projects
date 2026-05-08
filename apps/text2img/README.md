# AI Text-to-Image Tool (Cloudflare AI)

[English](./README.md) | [中文](./README.zh-CN.md)

A free online AI text-to-image tool built with Next.js, powered by Cloudflare Workers AI. Supports multiple models including FLUX.1, Stable Diffusion XL, and DreamShaper.

Preview: https://text2img.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/og-image.png)

## Features

- Multiple AI image generation models (Stable Diffusion XL, FLUX.1, DreamShaper, etc.)
- Random prompt library
- Rich parameter configuration (size, steps, guidance scale, random seed, etc.)
- Dark / light theme toggle
- Responsive design for mobile
- Parameter copy function
- One-click image download

## Tech Stack

- **Framework**: Next.js 16
- **UI**: shadcn/ui + Tailwind CSS
- **Data Fetching**: TanStack Query (React Query)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install Dependencies

```bash
pnpm install
```

### Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in the following:

```bash
PASSWORDS=
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for Production

```bash
pnpm build
pnpm start
```

## Deployment

### Deploy to Cloudflare Pages

The project is configured with `@opennextjs/cloudflare` and can be deployed to Cloudflare Pages or Workers.

```bash
pnpm deploy
```

## Project Structure

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

## Supported Models

| Provider | Model | Status |
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

## 📜 License

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
