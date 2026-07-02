# ByCut

[English](./README.md) | [中文](./README.zh-CN.md)

Open-source, browser-based video editor — a free CapCut alternative with a full timeline, AI captions, and GPU-accelerated rendering. Every edit and export runs locally in the browser; nothing is ever uploaded to a server.

Preview: https://bycut.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png)

## Features

- **Multi-track Timeline Editing**
  - Drag and drop media clips onto a multi-track timeline
  - Timeline bookmarks with drag-to-reposition support
  - Full undo/redo command system

- **AI Features**
  - Automatic caption/subtitle generation
  - Text-to-speech synthesis

- **Rich Media Effects**
  - Stickers and transition effects
  - Keyframe animation
  - Export individual frames as images

- **Playback & Preview**
  - Adjustable playback speed
  - Volume control
  - Real-time canvas preview

- **User Experience**
  - GPU-accelerated canvas rendering
  - Customizable keyboard shortcuts
  - Internationalization support (English / Chinese)
  - Dark / Light theme
  - Responsive editor layout

## Tech Stack

- **Framework** — Next.js (App Router, locale-aware routing under `app/[locale]/`)
- **State** — Zustand
- **Video processing** — FFmpeg.wasm + mediabunny
- **AI** — Hugging Face Transformers, running in a Web Worker
- **Audio** — WaveSurfer.js
- **i18n** — next-intl (en / zh)

## Getting Started

### Prerequisites

- Node.js and pnpm (see the monorepo root `package.json` for versions)

### Install

```bash
# From the monorepo root
pnpm install
```

### Development

```bash
pnpm --filter @cdlab996/bycut dev
```

Opens at `http://bycut.localhost:3355` (routed through `@dotns/nsl` — no port hunting).

### Build / Deploy

```bash
pnpm --filter @cdlab996/bycut build     # next build
pnpm --filter @cdlab996/bycut build:cf  # @cloudflare/next-on-pages, for a Cloudflare Pages deploy
```

## Architecture

ByCut has no server component — it's a manager-based editor core running entirely client-side, backed by browser storage (IndexedDB / OPFS) and a Web Worker for AI transcription.

| Layer | Path | Responsibility |
|---|---|---|
| Editor managers | `src/core/managers/` | Self-contained editor subsystems: `media-manager`, `timeline-manager`, `playback-manager`, `selection-manager`, `audio-manager`, `renderer-manager`, `scenes-manager`, `save-manager`, `project-manager` |
| Undo/redo | `src/core/managers/commands.ts` | Command bus shared across the managers |
| Canvas renderer | `src/services/renderer/` | `canvas-renderer.ts` + `scene-builder.ts` + `scene-exporter.ts` + a node-based render tree (`nodes/`) for GPU-accelerated canvas compositing |
| Storage | `src/services/storage/` | `service.ts` with pluggable adapters — `indexeddb-adapter.ts` and `opfs-adapter.ts` — plus versioned project migrations in `services/storage/migrations/` |
| AI transcription | `src/services/transcription/` | Hugging Face Transformers running in a Web Worker (`worker.ts`) for AI caption generation |
| Thumbnails & frame cache | `src/services/timeline-thumbnail/`, `src/services/video-cache/` | Timeline frame thumbnail generation and frame caching |
| UI state (Zustand) | `src/stores/` | `editor-store`, `timeline-store`, `panel-store`, `media-preview-store`, `keybindings-store`, `assets-panel-store`, `sounds-store`, `stickers-store` |
| Keybindings | `src/stores/keybindings/` | User-customizable, persisted keyboard shortcuts |

## Privacy

- All video processing runs locally in the browser
- No data is uploaded to any server
- No registration or login required
- Open-source and auditable

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
