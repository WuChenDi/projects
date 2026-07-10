# byplay

[English](./README.md) | [中文](./README.zh-CN.md)

Online video player for testing and tuning HLS streams — load an M3U8 or a direct file, then dial in ABR, buffer, and retry behavior live and watch the stats update. Built with **Next.js (App Router)** and **hls.js**, all playback happens client-side.

> All video processing is done locally in the browser. No data is uploaded to any server.

Preview: https://byplay.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png)

## Features

- **Multi-format Playback**
  - HLS/M3U8 via hls.js with adaptive bitrate (ABR)
  - Direct playback for MP4, WebM, OGG, MOV, MKV, and more
  - Auto-detects format — HLS config panels hidden for direct video

- **HLS Controls**
  - Manual quality level switching or auto ABR
  - Configurable buffer, ABR, performance, and retry/loading-timeout settings
  - Real-time stats: bandwidth, buffered, dropped frames, current level

- **Ad Filtering**
  - Segment stripping via M3U8 manifest/level loader hooks
  - Four modes: off / keyword / heuristic / aggressive
  - Custom keyword list

- **General Playback**
  - Adjustable playback rate (0.25x – 4x)
  - Auto-play toggle
  - Event logs for debugging

- **Cross-tool Integration**
  - One-click jump to [vidl](https://vidl.pages.dev/) to download the current video
  - Locale is preserved across navigation (en/zh)
  - Playback events are reported to the `byplay-log` worker (configurable endpoint)

## Tech Stack

- **Framework** — Next.js (App Router), React, TypeScript
- **Playback** — hls.js (HLS/M3U8 ABR engine), native `<video>` for direct formats
- **i18n** — next-intl (en / zh)

## Getting Started

### Prerequisites

- Node.js and pnpm (see the monorepo root `package.json`)

### Install

```bash
pnpm install
```

### Development

```bash
pnpm --filter @cdlab/byplay dev
```

Runs at `http://byplay.localhost:3355` via `@dotns/nsl`.

### Build / Deploy

```bash
pnpm --filter @cdlab/byplay build     # next build
pnpm --filter @cdlab/byplay build:cf  # @cloudflare/next-on-pages
```

Deployed as a static-ish Next.js app on Cloudflare Pages via `@cloudflare/next-on-pages`.

## Architecture

| Path | Purpose |
|---|---|
| `src/hooks/use-hls-player.ts` | hls.js wrapper — owns `HlsConfig`, playback state, level switching, ad-filter hooks, and event logs |
| `src/components/player/source-card.tsx` | URL input, clipboard paste, jump-to-vidl action |
| `src/components/player/abr-card.tsx` | Adaptive bitrate tuning (bandwidth estimate, up/down factors) |
| `src/components/player/buffer-card.tsx` | Buffer length/size configuration |
| `src/components/player/loading-retry-card.tsx` | Fragment/manifest/level loading timeouts and retry behavior |
| `src/components/player/ad-filter-card.tsx` | Ad-filter mode and keyword list |
| `src/components/player/playback-card.tsx` | Playback rate, quality level selection, config reset |
| `src/components/player/stats-card.tsx` | Real-time bandwidth/buffered/dropped-frame stats |
| `src/components/player/event-logs-card.tsx` | Collapsible hls.js event log |

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
