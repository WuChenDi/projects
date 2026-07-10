# text2img

[English](./README.md) | [中文](./README.zh-CN.md)

Free, no-registration AI text-to-image tool — type a prompt, pick a model, get an image. Built with **Next.js (App Router)** and **Cloudflare Workers AI**, deployed via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).

Preview: https://text2img.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/og-image.png)

## Features

- **Multi-model generation** (`src/app/api/generate/route.ts`) — routes each request to the right Workers AI binding and input shape per model group
  - **Black Forest Labs FLUX** (FLUX.2 klein/dev, FLUX.1 schnell), **Stability AI** Stable Diffusion XL, **ByteDance** SDXL Lightning, **Lykon** DreamShaper — see the model table below for the full, current status list
  - Per-model `prepareInputs` / `processResponse` adapters normalize prompt, size, steps, guidance, seed, and (for FLUX) response parsing across differently-shaped Workers AI outputs
- **Random prompt library** (`GET /api/prompts`) — one-click random prompt fill
- **Model catalog** (`GET /api/models`) — model list with provider/group metadata, served from `src/lib/data.ts`
- **Rich parameter controls** — size, steps, strength, guidance scale, and seed, tunable per generation
- **Generation history** — results (including in-flight/failed) are tracked in a Zustand store (`src/store/useImageStore.ts`); completed image blobs persist in IndexedDB (`src/lib/storage.ts`) while metadata persists to `localStorage`, so history survives a reload without ever storing the password or source image bytes
- **Optional password gate** — when `PASSWORDS` is set, the client hashes the password (Argon2id) before sending it; the server verifies the hash against the configured list without the plaintext ever crossing the wire
- **Dark / light theme toggle**
- **One-click image download**

## Tech Stack

- **Framework** — Next.js (App Router), React, TypeScript
- **UI** — shadcn/ui (`@cdlab/ui`) + Tailwind CSS
- **Data fetching / mutations** — TanStack Query (`useQuery` for models/prompts, `useMutation` for generation)
- **State** — Zustand (`useImageStore`, persisted)
- **Platform** — Cloudflare Workers AI (`AI` binding), deployed via OpenNext
- **i18n** — next-intl (en / zh)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install

```bash
pnpm install
```

### Development

```bash
pnpm --filter @cdlab/text2img dev
```

Served at `http://text2img.localhost:3355` via `@dotns/nsl` — no port hunting.

### Configuration

Copy `.env.example` to `.env.local`:

```bash
PASSWORDS=
```

`PASSWORDS` is a comma-separated list of accepted passwords for the generate endpoint; leave it empty to disable the password gate.

### Build / Deploy

Builds with `@opennextjs/cloudflare`, not the plain Next.js build.

```bash
pnpm --filter @cdlab/text2img deploy
```

Requires a Cloudflare Workers AI (`AI`) binding — see `wrangler.jsonc`.

## Supported Models

| Provider | Model | Status |
| --- | --- | --- |
| Black Forest Labs | FLUX.2 [klein] 9B | enabled |
| Black Forest Labs | FLUX.2 [klein] 4B | enabled |
| Black Forest Labs | FLUX.2 [dev] | enabled |
| Black Forest Labs | FLUX.1 [schnell] | enabled |
| Leonardo AI | Lucid Origin | disabled |
| Leonardo AI | Phoenix 1.0 | disabled |
| ByteDance | Stable Diffusion XL Lightning | enabled |
| Lykon | DreamShaper 8 LCM | enabled |
| Stability AI | Stable Diffusion XL Base 1.0 | enabled |
| Runway ML | Stable Diffusion v1.5 img2img | disabled |
| Runway ML | Stable Diffusion v1.5 Inpainting | disabled |

Disabled models are defined in `src/lib/data.ts` but rejected by `/api/generate` at request time.

## License

[MIT](../../LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
