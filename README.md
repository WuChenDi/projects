# @cdlab996/projects-monorepo

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A5%2010-f69220.svg)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-cc00ff.svg)](https://turbo.build/)
[![NSL](https://img.shields.io/badge/dev%20proxy-%40nsio%2Fnsl-4a9eff.svg)](https://github.com/dotns/nsl)

[English](./README.md) | [中文](./README.zh-CN.md)

A modern web tools monorepo built with **Turborepo + pnpm**, spanning Next.js, Nuxt, Hono, and more. Local dev is proxied by [@dotns/nsl](https://github.com/dotns/nsl) — every app gets a stable URL at `http://<name>.localhost:3355`, no port hunting needed.

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

### byTTS

**Browser-based Text-to-Speech Tool**

https://bytts.pages.dev/

- Convert text to speech via Microsoft Azure Cognitive Services with cascaded voice selection, rate, and pitch controls
- SSML synthesis, streaming audio output, configurable client trace ID
- Tech: Next.js (App Router) · Radix UI · Edge Runtime · Microsoft Azure Speech Service

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bytts/og-image.png" alt="bytts" />
</details>

### byshot

**Personal Photography Collection**

https://byshot.pages.dev/

- Cloudinary-backed image gallery with responsive masonry layout (1 / 2 / 3 / 4 columns)
- Full-screen lightbox with keyboard navigation (`←` / `→` / `Esc`), touch swipe, and animated transitions
- Blurred placeholders via tiny Cloudinary-transformed JPEGs inlined as base64 data URLs
- Deep-linkable: `/p/[photoId]` single-photo carousel + `/?photoId=N` in-grid modal; last-viewed scroll restore
- Tech: Next.js 16 (App Router, RSC) + Cloudinary Node SDK + motion + Zustand + Tailwind CSS v4

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/image-gallery/index.png" alt="byshot" />
</details>

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

https://floxx.pages.dev/

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

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/live-user/index.png" alt="live-user" />
</details>

### wepush

**WeChat Test-Account Template Message Console**

https://wepush.cdlab.workers.dev/

- Web console for sending WeChat official-account template messages — recipients, templates, scheduled push, and a permanent push log
- Recipient management with city, festivals, anniversaries, and lunar calendar dates; built-in CMA station-code city picker (3240 entries)
- Template editor with live structure preview, real-data preview against any recipient, and `{{var.DATA}}` chip-insertion
- Push triggers: UI manual (single / batch), authenticated HTTP API (`Bearer <pushApiToken>`), Worker `scheduled()` cron — pause from Settings without redeploying
- Permanent push log with batch grouping, status filters, payload snapshots, and one-click retry
- Tech: Next.js 16 (App Router) + React 19 + Drizzle (LibSQL / D1) + TanStack Query/Form + Zustand + tyme4ts (solar / lunar) + @opennextjs/cloudflare → Cloudflare Workers (with cron triggers)

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/wepush/og-image.png" alt="wepush" />
</details>

### Flnk

**Privacy-first Link Shortener**

https://flnk.cdlab.workers.dev/

- Edge redirect engine (KV cache → D1 fallback → cache fill) with configurable status code and per-link expiration
- Geo routing by `cf.country` and device routing for Apple / Android user agents, with optional query forwarding
- Link protection: password gate (PBKDF2-SHA256), unsafe interstitial, social-bot OG HTML with cloaking
- Privacy-respecting analytics via Cloudflare Analytics Engine — no tracking cookies on the redirect path
- Dashboard with AI slug generation, multi-domain support, and export / import / backup; social login via better-auth (Google + GitHub)
- Tech: Next.js 16 (App Router) + React 19 + Drizzle (LibSQL / D1) + better-auth + Workers AI + @opennextjs/cloudflare → Cloudflare Workers (with cron cleanup)

<details>
  <summary>Preview</summary>
  <br/>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flnk/index.png" alt="Flnk" />
</details>

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

Dev servers are proxied by [@dotns/nsl](https://github.com/dotns/nsl) — each app is accessible at `http://<name>.localhost:3355` (name = package name with scope stripped).

```bash
pnpm dev                                     # Start all apps (parallel dev)
pnpm --filter @cdlab996/clearify dev         # → http://clearify.localhost:3355
pnpm --filter @cdlab996/baccarat dev         # → http://baccarat.localhost:3355
pnpm --filter @cdlab996/bycut dev            # → http://bycut.localhost:3355
pnpm --filter @cdlab996/vidl dev             # → http://vidl.localhost:3355
pnpm --filter @cdlab996/securec dev          # → http://securec.localhost:3355
pnpm --filter @cdlab996/text2img dev         # → http://text2img.localhost:3355
pnpm --filter @cdlab996/values dev           # → http://values.localhost:3355
pnpm --filter @cdlab996/byplay dev           # → http://byplay.localhost:3355
pnpm --filter @cdlab996/byplay-log dev       # → http://byplay-log.localhost:3355
pnpm --filter @cdlab996/bytts dev            # → http://bytts.localhost:3355
pnpm --filter @cdlab996/byshot dev           # → http://byshot.localhost:3355
pnpm --filter @cdlab996/dropply-web dev      # → http://dropply-web.localhost:3355
pnpm --filter @cdlab996/flox dev             # → http://flox.localhost:3355
pnpm --filter @cdlab996/live-user dev        # → http://live-user.localhost:3355
pnpm --filter @cdlab996/flnk dev             # → http://flnk.localhost:3355
pnpm --filter @cdlab996/wepush dev           # → http://wepush.localhost:3355
pnpm --filter @cdlab996/repo-changelog dev   # → http://repo-changelog.localhost:3355
pnpm build                                   # Build all apps
pnpm --filter @cdlab996/clearify run build
pnpm --filter @cdlab996/bycut run build
pnpm --filter @cdlab996/vidl run build
pnpm --filter @cdlab996/securec run build
pnpm --filter @cdlab996/text2img run build
pnpm --filter @cdlab996/values run build
pnpm --filter @cdlab996/byplay run build
pnpm --filter @cdlab996/byplay-log run build
pnpm --filter @cdlab996/bytts run build
pnpm --filter @cdlab996/byshot run build
pnpm --filter @cdlab996/dropply-web run build
pnpm --filter @cdlab996/flox run build
pnpm --filter @cdlab996/live-user run build
pnpm --filter @cdlab996/flnk run build
pnpm --filter @cdlab996/wepush run build
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
│   ├── byshot/            # Personal Photography Collection (Cloudinary)
│   ├── bytts/             # Text-to-Speech Tool
│   ├── clearify/          # Image & Video Toolbox
│   ├── dropply-api/       # Dropply File Sharing Cloudflare API
│   ├── dropply-web/       # Dropply File Sharing Web Frontend
│   ├── flox/              # Flox - Video Aggregation & Playback Platform
│   ├── live-user/         # Real-time Online User Counter
│   ├── repo-changelog/    # GitHub Release / Changelog Aggregation
│   ├── SecureC/           # Encryption Tool
│   ├── flnk/              # Privacy-first Link Shortener (Next.js + Cloudflare Workers)
│   ├── text2img/          # Text-to-Image Frontend
│   ├── value-vision/      # Value Comparison / Visualization
│   ├── vidl/              # Video Downloader (M3U8/HLS, MP4, etc.)
│   └── wepush/            # WeChat Test-Account Template Push Console
├── packages/
│   ├── cipher/            # Stream Cipher Library (@cdlab996/cipher)
│   ├── tsconfig/          # Shared TypeScript Config (@cdlab996/tsconfig)
│   ├── ui/                # Shared UI Component Library (@cdlab996/ui)
│   ├── uncrypto/          # Lightweight Crypto Utilities (@cdlab996/uncrypto)
│   └── utils/             # Common Utilities (@cdlab996/utils)
├── scripts/
│   └── clean.sh
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Tech Stack

| Layer             | Technology                                                                          |
| ----------------- | ----------------------------------------------------------------------------------- |
| **Frontend**      | React + Next.js 16+ (App Router) / Vue 3 + Nuxt 4                                   |
| **Type System**   | TypeScript 5                                                                        |
| **UI**            | shadcn/ui · Tailwind CSS v4 · Nuxt UI                                               |
| **Browser APIs**  | WebAssembly (FFmpeg.wasm) · WebGPU · Web Workers · Streams API                      |
| **Backend / API** | Cloudflare Workers · Hono + Zod Validator                                           |
| **Database**      | Drizzle ORM + LibSQL / Cloudflare D1                                                |
| **Engineering**   | Turborepo 2.x · pnpm 10 workspaces · Biome (Lint + Format) · @dotns/nsl (dev proxy) |

## License

[MIT](./LICENSE) License © 2026-PRESENT [wudi](https://github.com/WuChenDi)
