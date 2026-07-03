# Clearify

[English](./README.md) | [中文](./README.zh-CN.md)

Browser-based image and video toolbox — background removal, batch image compression, and video compression, all processed locally with zero server uploads.

Preview: https://clearify.pages.dev/

<details>
  <summary>Preview</summary>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/index.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/bg-pages.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/squish-pages.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/compress-pages.png" />
</details>

## Features

- **Background removal** (`/bg`)
  - One-click background removal via Transformers.js, with optional WebGPU acceleration
  - Replace the background with a solid color or a custom image
  - Export with transparency or a filled background
  - Runs fully in the browser — no uploads, privacy-focused

  > **Models:**
  >
  > - [MODNet (WebGPU)](https://huggingface.co/wuchendi/MODNet)
  > - [RMBG-2.0 (WASM)](https://huggingface.co/briaai/RMBG-2.0)
  > - [RMBG-1.4 (WASM)](https://huggingface.co/briaai/RMBG-1.4)
  >
  > Powered by [Transformers.js](https://www.npmjs.com/package/@huggingface/transformers)

- **Squish — batch image compression** (`/compress`)
  - Batch-compress multiple images in the browser via jSquash (WebAssembly)
  - Supports AVIF, JPEG, JXL, PNG, WebP
  - Adjustable quality (1-100%)
  - Drag-and-drop or paste input; download individually or in bulk
  - Local processing only — no uploads

- **Video compressor** (`/squish`)
  - Compress video up to 90% in the browser via FFmpeg.wasm
  - Multiple compression modes: CRF, bitrate, percentage, filesize
  - Customizable video/audio settings — H.264/H.265 video, AAC/MP3 audio
  - Real-time progress visualization
  - Local processing only — no uploads

## Tech Stack

- **Framework** — Next.js (App Router), React, TypeScript
- **Background removal** — Transformers.js, WebGPU (optional), WebAssembly fallback
- **Image compression** — jSquash (`@jsquash/avif`, `@jsquash/jpeg`, `@jsquash/jxl`, `@jsquash/png`, `@jsquash/webp`)
- **Video compression** — FFmpeg.wasm, `mediabunny`
- **State** — Zustand
- **Platform** — Cloudflare Pages via `@cloudflare/next-on-pages`

## Getting Started

### Prerequisites

- Node.js and pnpm (workspace-managed — see the monorepo root `README.md`)

### Install

```bash
# From monorepo root
pnpm install
```

### Development

```bash
# Start the dev server on http://clearify.localhost:3355 (via nsl)
pnpm --filter @cdlab996/clearify dev
```

### Build / Deploy

```bash
# Production build (Turbopack is not used here — wasm + worker mix requires webpack)
pnpm --filter @cdlab996/clearify build

# Build for Cloudflare Pages
pnpm --filter @cdlab996/clearify build:cf
```

## Architecture

- `src/app/bg`, `src/app/compress`, `src/app/squish` — one route per mode; no locale routing
- `src/lib/wasm.ts` — lazily loads the jSquash WASM module for the requested output format
- `src/lib/imageProcessing.ts`, `src/lib/process.ts` — pipeline: decode → transform → encode, with batch ZIP output via `jszip`
- `src/lib/canvas.ts` — canvas-based resize and composition
- `src/components/pages/{bg,compress,squish}` — one subdirectory per mode, mirroring the route structure

## Browser Support

- **Default experience** — all modern browsers (Chrome, Firefox, Safari, Edge)
- **Enhanced experience** — available in browsers with `WebGPU` support

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
