# bytts

[English](./README.md) | [中文](./README.zh-CN.md)

Free, browser-based text-to-speech tool — 300+ voices, adjustable rate/pitch, long-text auto-splitting, and a pluggable API manager so you can bring your own TTS backend.

Preview: https://bytts.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bytts/og-image.png)

## Features

- **SSML synthesis** — `POST /api/tts` (Edge Runtime, `src/app/api/tts/route.ts`) builds an SSML payload (`<mstts:express-as>` + `<prosody rate/pitch>`) and posts it to the Microsoft Azure Cognitive Services speech endpoint
- **Streaming audio** — the endpoint returns the synthesized clip as an `audio/mpeg` response; a 20-character preview plays instantly before committing to a full generation
- **Cascaded voice / rate / pitch controls** — voices are grouped by locale in a cascading picker, with `-100` to `+100` sliders for speech rate and pitch, `<break>` pause insertion (0–10s), and automatic splitting/merging for text up to 50,000 characters
- **API manager** — two built-in providers (Edge API, OpenAI-format "OAI-TTS") plus user-added custom providers; a custom provider with the same slot **overrides the matching builtin** in the picker, and builtin endpoint/key/limits can be edited in place and restored to defaults
- **Custom auth headers** — every provider (built-in or custom) configures its own auth header name (default `Authorization`) and key; a key sent under `Authorization` gets an automatic `Bearer` prefix, other header names are sent verbatim
- **Batch deletion** — multi-select delete for saved custom API configs, alongside per-item copy/edit and JSON export/import
- **Persistent history** — generation history with audio blobs stored in IndexedDB and metadata in localStorage; download a single clip or all of them as a ZIP
- **Password protection** — optional access control via `ACCESS_PASSWORD` with configurable session persistence

## Tech Stack

- **Framework** — Next.js (App Router), Edge Runtime API routes
- **Speech backend** — Microsoft Azure Cognitive Services Speech (SSML synthesis), plus any OpenAI-format or Edge-format TTS API added through the API manager
- **UI** — React 19 + TypeScript, `@cdlab/ui`, TanStack Form / Query
- **State** — Zustand (`useApiStore` for providers, `useHistoryStore` for history persistence via IndexedDB + localStorage)
- **Deployment** — Cloudflare Pages (`@cloudflare/next-on-pages`)

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
pnpm dev:bytts
```

Opens at `http://bytts.localhost:3355` (via `@dotns/nsl`).

### Build / Deploy

```bash
# Production build
pnpm --filter @cdlab/bytts build

# Cloudflare Pages build
pnpm --filter @cdlab/bytts run build:cf
```

## API

All endpoints run on the Edge Runtime.

### `POST /api/tts`

**Request body (JSON):**

| Field     | Type    | Default                            | Description                    |
| --------- | ------- | ---------------------------------- | ------------------------------ |
| `text`    | string  | —                                  | Text to convert (required)     |
| `voice`   | string  | `zh-CN-XiaoxiaoMultilingualNeural` | Voice short name               |
| `rate`    | number  | `0`                                | Speech rate (−100 to 100)      |
| `pitch`   | number  | `0`                                | Pitch adjustment (−100 to 100) |
| `format`  | string  | `audio-24khz-48kbitrate-mono-mp3`  | TTS output format              |
| `preview` | boolean | `true`                             | `false` adds a download header |

**Response:** `audio/mpeg` stream

## Environment Variables

| Variable                  | Description                                       | Default |
| -------------------------- | -------------------------------------------------- | ------- |
| `ACCESS_PASSWORD`         | Site access password; leave empty to disable auth | —       |
| `PERSIST_PASSWORD`        | `false` to require password re-entry each session | `true`  |
| `MICROSOFT_CLIENTTRACEID` | Client trace ID passed to the TTS backend         | —       |

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
