# @cdlab996/kvideo

A modern video aggregation and playback platform built with Next.js 16, React 19, and Tailwind CSS 4.

**Live Demo: [https://kvideo.pages.dev/](https://kvideo.pages.dev/)**

## Features

- **Multi-source parallel search** - SSE streaming results from 38+ built-in video sources
- **HLS/M3U8 playback** - Volcengine VePlayer with ad filtering (keyword, heuristic, SCTE-35)
- **Liquid Glass design** - Glassmorphic UI with backdrop-filter, glow effects, and depth layering
- **Service Worker caching** - M3U8 manifest and video segment caching (7-day TTL, 1 GB max)
- **Watch history & favorites** - 50-item history with playback position, persistent favorites
- **Password protection** - Local or environment-based password gate with session persistence
- **Premium mode** - Isolated routing, sources, history, and favorites
- **Responsive design** - Mobile-optimized player with touch gestures and orientation support
- **Theme system** - Light / dark / system with View Transition API

## Tech Stack

- Next.js 16 (App Router, Edge Runtime API routes)
- React 19 + TypeScript
- Tailwind CSS 4
- Zustand 5 (state management with localStorage persistence)
- HLS.js + Volcengine VePlayer
- @dnd-kit (drag-and-drop source management)

## Development

```bash
pnpm dev:kvideo
```

## Deployment

**Cloudflare Pages:**

```bash
pnpm --filter @cdlab996/kvideo run build:cf
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_NAME` | Header display name |
| `NEXT_PUBLIC_SITE_TITLE` | Browser tab title |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Meta description |
| `ACCESS_PASSWORD` | Global password protection |
| `PERSIST_PASSWORD` | Password persistence (default: true) |
| `NEXT_PUBLIC_SUBSCRIPTION_SOURCES` | Auto-load sources from JSON URLs |
| `AD_KEYWORDS` | Custom ad filter keywords (comma-separated) |
| `AD_KEYWORDS_FILE` | Path to ad keywords file |

## License

[MIT](../../LICENSE)
