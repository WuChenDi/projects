# @cdlab996/projects-monorepo

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A5%2010-f69220.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-cc00ff.svg)](https://turbo.build/)

[中文文档](./README.zh-CN.md)

A modern web tools monorepo built with **Turborepo + pnpm**, spanning Next.js, Nuxt, Hono, and more.

> [!IMPORTANT]
> Most apps run **entirely in the browser** with **zero server uploads** — your data never leaves your device.
> Privacy-first · Local-first · Performance-first

## Applications

### Clearify

**Image & Video Processing Toolbox**

https://clearify.pages.dev/

- One-click background removal, batch compression (AVIF / WebP / JXL and more), video compression (up to 90% size reduction)
- Tech: Transformers.js + WebGPU (background removal), FFmpeg.wasm (compression & transcoding)
- Highlights: local WebGPU acceleration, efficient batch processing, completely upload-free

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/og-image.png" alt="Clearify" />
</details>

### SecureC

**Client-side File / Text Encryption Tool**

https://securec.pages.dev/

- XChaCha20-Poly1305 encryption, Argon2id key derivation, ECIES public key encryption, large file chunked processing
- Tech: @noble/ciphers + Web Workers
- Highlights: 10 MB chunking + Web Worker background processing, UI stays smooth

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/og-image.png" alt="SecureC" />
</details>

### Dropply

**End-to-end Encrypted File Sharing Platform**

https://dropply.pages.dev/

- Client-side AES-GCM + Argon2id encryption — encryption key shared only via URL fragment, server never sees plaintext
- Tab-based Share / Retrieve UI; multipart upload for large files (20 MB chunks, 3 concurrent parts); configurable expiry; optional TOTP gate; email sharing; i18n (en/zh)
- Decoupled architecture: `dropply-web` (Next.js + Cloudflare Pages) + `dropply-api` (Cloudflare Workers)

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/og-image.png" alt="Dropply" />
</details>

### text2img

**Browser-based Text-to-Image Generator**

https://text2img.cdlab.workers.dev/

- Supports FLUX, SDXL, DreamShaper and more, random prompts, rich parameter controls
- Tech: Next.js App Router + TanStack Query + Cloudflare AI
- Highlights: real-time preview, dark/light theme, one-click download

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/og-image.png" alt="text2img" />
</details>

### ByCut

**Browser-based Video Editor**

https://bycut.pages.dev/

- A fully client-side, open-source video editor (CapCut alternative) — zero server uploads, complete privacy
- Multi-track timeline editing, timeline bookmarks, AI caption generation, text-to-speech, stickers, transitions, keyframe animation
- Tech: Next.js (App Router, static export) + Zustand + FFmpeg.wasm + Hugging Face Transformers + WaveSurfer.js + next-intl (en/zh)
- Highlights: GPU-accelerated canvas rendering, full undo/redo command system, customizable keyboard shortcuts

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bycut/og-image.png" alt="ByCut" />
</details>

### byplay

**Online Video Player**

https://byplay.pages.dev/

- Supports HLS (M3U8 adaptive bitrate), MP4, WebM, OGG, and more
- HLS quality switching, ABR adaptive bitrate, configurable buffer & retry settings
- One-click jump to [vidl](https://vidl.pages.dev/) to download the current video
- Extensible monitoring and analytics capabilities

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png" alt="byplay" />
</details>

### byplay-log

**ByPlay Player Monitoring & Analytics Service**

- Playback data collection, log reporting, and behavior analytics for ByPlay
- Suitable as a player log backend or data infrastructure for A/B testing / quality monitoring

### vidl

**Online Video Downloader**

https://vidl.pages.dev/

- Supports M3U8/HLS, MP4, WebM, MKV, FLV, and more — auto-detects URL format
- M3U8: range download, stream download, AES-128 decryption, TS-to-MP4 conversion
- One-click jump to [byplay](https://byplay.pages.dev/) to preview/play the current video
- Tech: mux.js + Streams API
- Highlights: near-zero memory stream download, pause/resume, auto-retry with exponential backoff

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/vidl/og-image.png" alt="vidl" />
</details>

### value-vision

**Crypto / Fiat / Commodity Value Comparison Tool**

https://values.pages.dev/

- Compare cryptocurrencies, fiat currencies, and commodities side by side on a unified scale
- Highlights: enter an asset or amount and instantly see "what it can buy" or "what it's equivalent to"

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png" alt="value-vision" />
</details>

### Baccarat

**Telegram Baccarat Game Bot**

- Full baccarat game logic with betting, dice-based card dealing, and automatic settlement
- Auto-game mode with configurable intervals, per-group game isolation via Durable Objects
- Game history persistence via Durable Objects SQLite
- Tech: Hono + Grammy + Cloudflare Workers + Durable Objects

### Flox

**Video Aggregation & Playback Platform**

https://flox.pages.dev/

- Multi-source parallel video search with real-time streaming results (SSE), 38+ built-in sources
- HLS/M3U8 playback with ad filtering (keyword, heuristic, SCTE-35), proxy mode, auto-next episode
- Service Worker caching, watch history, favorites, password protection, premium mode isolation
- Tech: Next.js 16 (App Router) + React 19 + Zustand + HLS.js + Volcengine VePlayer + Tailwind CSS 4

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flox/og-image.png" alt="flox" />
</details>

### LiveUser

**Real-time Online User Counter**

https://live-user.cdlab.workers.dev/

- Embed a single script tag to display real-time online user count and total visits on any webpage
- WebSocket Hibernation API — Durable Object hibernates when idle to minimize costs
- Visit counter stored in DO-embedded SQLite with atomic updates (no data loss under concurrency)
- Tech: Hono + Cloudflare Workers + Durable Objects + SQLite

### repo-changelog

**Open Source Release / Changelog Aggregation Dashboard**

https://repo-changelog.vercel.app/

- Track releases and changelogs from multiple GitHub repositories in one dashboard
- Search by repository / user / organization, sort by stars, update time, and more

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/og-image.png" alt="repo-changelog" />
</details>

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10

### Clone & Install

```bash
git clone https://github.com/WuChenDi/projects.git
cd projects
pnpm install
```

### Common Commands

```bash
pnpm dev                                     # Start all apps (parallel dev)
pnpm --filter @cdlab996/clearify dev         # Start Clearify only
pnpm --filter @cdlab996/baccarat dev         # Start Baccarat only (port 3020)
pnpm --filter @cdlab996/bycut dev            # Start ByCut only (port 3020)
pnpm --filter @cdlab996/vidl dev             # Start vidl only (port 3010)
pnpm --filter @cdlab996/securec dev          # Start SecureC only (port 3009)
pnpm --filter @cdlab996/text2img dev         # Start Text2Img only (port 3012)
pnpm --filter @cdlab996/values dev           # Start Value Vision only (port 3011)
pnpm --filter @cdlab996/byplay dev           # Start ByPlay only (port 3016)
pnpm --filter @cdlab996/byplay-log dev       # Start ByPlay Log only (port 3017)
pnpm --filter @cdlab996/dropply-web dev      # Start Dropply Web only (port 3013)
pnpm --filter @cdlab996/flox dev             # Start Flox only (port 3023)
pnpm --filter @cdlab996/live-user dev        # Start LiveUser only (port 3021)
pnpm --filter @cdlab996/repo-changelog dev   # Start Repo Changelog only (port 3019)
pnpm build                                   # Build all apps
pnpm --filter @cdlab996/clearify run build
pnpm --filter @cdlab996/bycut run build
pnpm --filter @cdlab996/vidl run build
pnpm --filter @cdlab996/securec run build
pnpm --filter @cdlab996/text2img run build
pnpm --filter @cdlab996/values run build
pnpm --filter @cdlab996/byplay run build
pnpm --filter @cdlab996/byplay-log run build
pnpm --filter @cdlab996/dropply-web run build
pnpm --filter @cdlab996/flox run build
pnpm --filter @cdlab996/live-user run build
pnpm --filter @cdlab996/repo-changelog run build
pnpm lint                          # Biome lint
pnpm format                        # Biome format all code
pnpm clean                         # Clean node_modules / cache / build artifacts
```

## Project Structure

```text
.
├── apps/
│   ├── baccarat/          # Telegram Baccarat Game Bot
│   ├── bycut/             # Browser-based Video Editor
│   ├── byplay/            # Online Video Player
│   ├── byplay-log/        # ByPlay Monitoring & Analytics Service
│   ├── clearify/          # Image & Video Toolbox
│   ├── dropply-api/       # Dropply File Sharing Cloudflare API
│   ├── dropply-web/       # Dropply File Sharing Web Frontend
│   ├── flox/              # Flox - Video Aggregation & Playback Platform
│   ├── live-user/         # Real-time Online User Counter
│   ├── vidl/              # Video Downloader (M3U8/HLS, MP4, etc.)
│   ├── repo-changelog/    # GitHub Release / Changelog Aggregation
│   ├── SecureC/           # Encryption Tool
│   ├── text2img/          # Text-to-Image Frontend
│   └── value-vision/      # Value Comparison / Visualization
├── packages/
│   ├── tsconfig/          # Shared TypeScript Config (@cdlab996/tsconfig)
│   ├── ui/                # Shared UI Component Library (@cdlab996/ui)
│   ├── uncrypto/          # Lightweight Crypto Library (@cdlab996/uncrypto)
│   └── utils/             # Common Utilities (@cdlab996/utils)
├── scripts/
│   └── clean.sh
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Tech Stack

| Layer             | Technology                                                     |
| ----------------- | -------------------------------------------------------------- |
| **Frontend**      | React + Next.js 16+ (App Router) / Vue 3 + Nuxt 4              |
| **Type System**   | TypeScript 5                                                   |
| **UI**            | shadcn/ui · Tailwind CSS v4 · Nuxt UI                          |
| **Browser APIs**  | WebAssembly (FFmpeg.wasm) · WebGPU · Web Workers · Streams API |
| **Backend / API** | Cloudflare Workers · Hono + Zod Validator                      |
| **Database**      | Drizzle ORM + LibSQL / Cloudflare D1                           |
| **Engineering**   | Turborepo 2.x · pnpm 10 workspaces · Biome (Lint + Format)     |

## License

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
