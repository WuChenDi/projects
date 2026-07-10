# Video Downloader

[English](./README.md) | [中文](./README.zh-CN.md)

Pure-browser video downloader — parses M3U8/HLS playlists and direct video links, decrypts, and muxes entirely in the browser, with near-zero memory usage via the Streams API. No upload, no server-side processing.

Preview: https://vidl.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/vidl/og-image.png)

## Features

- **Multi-format support**
  - M3U8/HLS playlist parsing (`src/lib/m3u8-parser.ts`), including master-playlist variant selection by bandwidth/resolution
  - Direct download for MP4, WebM, MKV, AVI, MOV, FLV, WMV, MPEG, TS (`VIDEO_MIME_MAP` in `src/lib/video-utils.ts`)
  - Auto-detect URL format — no manual switching needed

- **Single & batch download**
  - Single mode: paste one URL, parse, configure, download
  - Batch mode (`src/lib/batch-utils.ts`): paste multiple URLs at once, auto-parse all, per-item quality/format/range/filename configuration, sequential processing with per-item error handling

- **Range download** — custom segment range via slider, with sampled file-size estimation (`estimateFileSize`)

- **Stream download (recommended for large files)** — near-zero memory usage, writes to disk as segments arrive via the browser Streams API; falls back to normal (in-memory) download where unsupported (Safari)

- **Resilience** — pause/resume, per-segment retry, and configurable concurrency with exponential-backoff retry (`downloadTS` worker pool in `src/lib/download-engine.ts`)

- **AES-128 decryption** (`src/lib/aes-decryptor.ts`) — auto-detects `#EXT-X-KEY`, fetches the key, and decrypts each segment before muxing

- **TS → MP4 muxing** — transmuxes downloaded `.ts` segments to MP4 via `mux.js`, entirely client-side, with audio/video track and timestamp sync

- **Cross-tool integration** — one-click jump to [byplay](https://byplay.pages.dev/) to preview/play the current video, preserving the active locale

- **User experience** — per-segment status grid with retry, i18n (English/Chinese), dark/light theme, responsive layout

## Tech Stack

- **Framework** — Next.js (App Router), React, TypeScript
- **Download pipeline** — `mux.js` (TS → MP4 transmuxing) + browser Streams API (`WritableStream`, via a bundled `StreamSaver.js`) for near-zero-memory writes
- **State** — Zustand (`src/stores/`)
- **i18n** — next-intl (en / zh)
- **UI** — `@cdlab/ui` (Tailwind v4, shadcn/ui primitives)

## Getting Started

### Prerequisites

- Node.js and `pnpm` (see the repo root for the pinned versions)

### Install

```bash
# From the monorepo root
pnpm install
```

### Development

```bash
pnpm --filter @cdlab/vidl dev
```

Dev server: `http://vidl.localhost:3355` (via `@dotns/nsl` — no port hunting).

### Build / Deploy

```bash
pnpm --filter @cdlab/vidl build     # next build
pnpm --filter @cdlab/vidl build:cf  # @cloudflare/next-on-pages
```

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/lib/download-engine.ts` | `DownloadEngine` class — orchestrates parse/download/pause/retry/cancel; runs a concurrent worker pool per segment with per-attempt timeout and exponential-backoff retry; drives both in-memory and stream-writer completion paths |
| `src/lib/m3u8-parser.ts` | Detects master vs. media playlists and parses `#EXT-X-STREAM-INF` variants (bandwidth, resolution, name) |
| `src/lib/aes-decryptor.ts` | `AESDecryptor` — standalone AES-128-CBC implementation (key expansion + block decrypt + PKCS7 unpad) used to decrypt HLS segments |
| `src/lib/video-utils.ts` | Shared types, URL resolution (`applyURL`), MIME map, `fetchData`/`estimateFileSize`, and `triggerBrowserDownload` (in-memory Blob assembly) |
| `src/lib/batch-utils.ts` | `fetchUrlMetadata` — resolves a URL (direct video / master playlist / media playlist) to segment count and estimated size for the batch-mode queue |
| `src/stores/` | Zustand stores: `download-store` (single-download state), `batch-store` (batch queue), `settings-store` (concurrency/timeout/retry, persisted to `localStorage`) |

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
