# Flox

[中文文档](./README.zh-CN.md)

A modern video aggregation and playback platform built with Next.js 16, React 19, and Tailwind CSS 4.

Preview: https://flox.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flox/og-image.png)

## Features

- **Multi-source parallel search** - SSE streaming results from 38+ built-in video sources simultaneously
- **HLS/M3U8 playback** - Volcengine VePlayer with multi-layered ad filtering (keyword, heuristic, aggressive, SCTE-35)
- **Liquid Glass design** - Glassmorphic UI with backdrop-filter, glow effects, and depth layering
- **Service Worker caching** - M3U8 manifest and video segment caching (7-day TTL, 1 GB max)
- **Watch history & favorites** - 50-item history with playback position resume, persistent favorites
- **Password protection** - Local or environment-based password gate with session persistence
- **Premium mode** - Isolated routing, sources, history, and favorites
- **Responsive design** - Mobile-optimized player with touch gestures and orientation support
- **Theme system** - Light / dark / system with View Transition API
- **Source management** - Add custom sources, drag-and-drop reorder, enable/disable, import/export

## Tech Stack

- Next.js 16 (App Router, Edge Runtime API routes)
- React 19 + TypeScript
- Tailwind CSS 4
- Zustand 5 (state management with localStorage persistence)
- TanStack Query
- HLS.js + Volcengine VePlayer
- @dnd-kit (drag-and-drop source management)
- Cloudflare Pages

## Development

```bash
pnpm dev:flox
```

## Deployment

**Cloudflare Pages:**

```bash
pnpm --filter @cdlab996/flox run build:cf
```

## Ad Filtering

Flox includes a multi-layered M3U8 ad filtering system. Configure it in **Settings > Player Settings > Ad Filter**.

### Modes

| Mode | Behavior |
|---|---|
| **Off** | No filtering |
| **Keyword** | Removes segments whose URL contains ad keywords (built-in + custom). Supports `#EXT-X-CUE-OUT/IN` (SCTE-35) tag detection. |
| **Heuristic** | Keyword + block-based scoring analysis. Splits the playlist into blocks by `#EXT-X-DISCONTINUITY`, learns the main content pattern from the largest block, then scores each block across multiple dimensions. Blocks scoring >= 5.0 are removed. |
| **Aggressive** | Same scoring as Heuristic (threshold lowered to >= 3.0), **plus strips all `#EXT-X-DISCONTINUITY` tags**. Designed for sources where ad segments share the same CDN, path, filename pattern, and duration as main content — the only remaining signal is the discontinuity marker itself. |

### Heuristic Scoring Dimensions

| Dimension | Score | Description |
|---|---|---|
| CUE tags | 10.0 | `#EXT-X-CUE-OUT` / `#EXT-X-CUE-IN` (SCTE-35 standard) |
| Path prefix mismatch | +5.0 | All segments in the block come from a different CDN directory than main content |
| Small block detection | +5.0 / +3.0 | Block segment count is <= 20% / <= 35% of the median block size |
| TS sequence number gap | +4.0 | For sequential-numbered sources (00001.ts, 00002.ts, ...), block numbers don't connect to the main range |
| Filename length variance | +3.0 | Average filename length differs by > 2 characters from main content |
| URL keyword match | +2.5/seg | URL contains ad-related keywords (advert, preroll, vast, etc.) |
| Filename pattern mismatch | +1.5 | All filenames differ from the main block's common prefix pattern |
| EXTINF duration anomaly | +1.5 | Dominant segment duration differs > 30% from main content |

### Custom Keywords

When a non-off mode is selected, a text input appears for custom keywords (one per line). Keywords are matched against segment URLs.

Keywords can also be injected via environment variables (see below).

### Architecture

```
HLS.js AdFilterLoader (intercepts manifest/level loading)
  → filterM3u8Ad()
    1. Heuristic block analysis: parseBlocks() → learnMainPattern() → scoreBlock()
    2. CUE tag state machine (SCTE-35 CUE-OUT / CUE-IN)
    3. Keyword backtracking
    4. DISCONTINUITY stripping (aggressive mode only)
    5. URL normalization (relative → absolute for Blob playback)

Native HLS (Safari/iOS)
  → fetch master playlist → recursive sub-playlist processing → Blob URL replacement
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_NAME` | Header display name |
| `NEXT_PUBLIC_SITE_TITLE` | Browser tab title |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Meta description |
| `ACCESS_PASSWORD` | Global password protection |
| `PERSIST_PASSWORD` | Password persistence (default: true) |
| `NEXT_PUBLIC_SUBSCRIPTION_SOURCES` | Auto-load sources from JSON URLs (comma-separated) |
| `AD_KEYWORDS` | Custom ad filter keywords (comma-separated) |
| `AD_KEYWORDS_FILE` | Path to ad keywords file |

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
