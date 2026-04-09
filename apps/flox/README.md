# Flox

[中文文档](./README.zh-CN.md)

A modern video aggregation and playback platform built with Next.js 16, React 19, and Tailwind CSS 4.

Preview: https://flox.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flox/og-image.png)

## Features

- **Multi-source parallel search** - SSE streaming results from 38+ built-in video sources simultaneously
- **HLS/M3U8 playback** - Volcengine VePlayer with ad filtering (keyword, heuristic, SCTE-35)
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
