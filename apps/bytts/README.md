# bytts

[中文文档](./README.zh-CN.md)

Free online text-to-speech tool. Supports 300+ voices, adjustable speed and pitch, long-text auto-splitting, and persistent generation history.

Preview: https://bytts.pages.dev/

## Features

- **300+ voices** - Multiple languages and accents, grouped by locale for easy browsing
- **Speech rate control** - Adjustable from −100% to +100%
- **Pitch control** - Adjustable from −100% to +100%
- **Pause insertion** - Insert SSML `<break>` tags at cursor position (0–10 seconds)
- **Long-text support** - Up to 50,000 characters; automatically splits and merges into a single audio file
- **Preview mode** - Quick preview using the first 20 characters before full generation
- **Persistent history** - Generation history with audio blobs stored in IndexedDB and metadata in localStorage
- **Audio download** - MP3 download with optional custom filename
- **Password protection** - Optional access control via `ACCESS_PASSWORD` env var with configurable session persistence
- **TTS API** - POST endpoint runs on Edge Runtime

## Tech Stack

- Next.js (App Router, Edge Runtime API routes)
- React 19 + TypeScript
- TanStack Query
- Zustand (history persistence via IndexedDB + localStorage)
- Configurable TTS backend
- Cloudflare Pages

## Development

```bash
pnpm dev:bytts
```

## Deployment

**Cloudflare Pages:**

```bash
pnpm --filter @cdlab996/bytts run build:cf
```

## API

All endpoints run on the Edge Runtime.

### `POST /api/tts`

**Request body (JSON):**

| Field     | Type    | Default                            | Description                          |
| --------- | ------- | ---------------------------------- | ------------------------------------ |
| `text`    | string  | —                                  | Text to convert (required)           |
| `voice`   | string  | `zh-CN-XiaoxiaoMultilingualNeural` | Voice short name                     |
| `rate`    | number  | `0`                                | Speech rate (−100 to 100)            |
| `pitch`   | number  | `0`                                | Pitch adjustment (−100 to 100)       |
| `format`  | string  | `audio-24khz-48kbitrate-mono-mp3`  | TTS output format                    |
| `preview` | boolean | `true`                             | `false` adds a download header       |

**Response:** `audio/mpeg` stream

## Environment Variables

| Variable                  | Description                                          | Default |
| ------------------------- | ---------------------------------------------------- | ------- |
| `ACCESS_PASSWORD`         | Site access password; leave empty to disable auth    | —       |
| `PERSIST_PASSWORD`        | `false` to require password re-entry each session    | `true`  |
| `MICROSOFT_CLIENTTRACEID` | Client trace ID passed to the TTS backend            | —       |

## License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
