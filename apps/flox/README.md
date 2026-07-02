# Flox

[English](./README.md) | [中文](./README.zh-CN.md)

Search dozens of Chinese video sources at once and get results the instant each one replies — no waiting for the slowest source to finish. Built with **Next.js 16 (App Router) + React 19**, streamed over SSE, and played back through a custom HLS engine with multi-layered ad filtering.

Preview: https://floxx.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flox/og-image.png)

## Features

- **Multi-source parallel search** — `POST /api/search-parallel` fans out to every enabled source in parallel and streams matches back over SSE as each source replies, instead of waiting for the slowest one
  - Curated source list (38+ entries) importable with one click, plus user-added custom sources with drag-and-drop reorder, enable/disable, and import/export
  - Per-source latency is tracked and surfaced alongside each result
- **Custom HLS player** — dual player engines selectable per user: Volcengine VePlayer, or a fully custom hls.js-based engine (`VideoPlayer` → `CustomVideoPlayer` → `DesktopVideoPlayer` with its own control layer)
  - Multi-layered M3U8 ad filtering — keyword, heuristic (block scoring), aggressive, and SCTE-35 `#EXT-X-CUE-OUT/IN` detection
  - Intro/outro auto-skip, auto-next episode, stall detection, and playback-position resume
- **Video proxy** — `GET /api/proxy` streams upstream video/manifest responses through the edge with CORS headers added, forwarding only `cookie`/`range`, and rewrites M3U8 segment URLs to route through the proxy
- **Favorites & history** — persistent favorites, watch-later queue, and a bounded watch history with resume position, all backed by `localStorage`
- **Password gate** — local or environment-based password protection with session persistence, isolated from the backup/export flow so an exported settings file can't be replayed to bypass it
- **Premium mode** — isolated routing, sources, history, and favorites, kept fully separate from the standard content surface
- **Responsive design** — mobile-optimized player with touch gestures and orientation support
- **Theme system** — light / dark / system, using the View Transition API
- **Service Worker caching** — M3U8 manifest and video segment caching

## Tech Stack

- **Framework** — Next.js 16 (App Router, Edge Runtime API routes), React 19, TypeScript
- **Styling** — Tailwind CSS 4, `@cdlab996/ui`
- **State** — Zustand 5 (localStorage-persisted stores), TanStack Query (search mutation + streaming)
- **Playback** — hls.js (custom engine) + Volcengine VePlayer, `@dnd-kit` for source reordering
- **Deploy** — Cloudflare Pages via `@cloudflare/next-on-pages`

## Getting Started

### Prerequisites

- Node.js + pnpm (workspace-managed, see repo root)

### Install

```bash
pnpm install
```

### Development

```bash
pnpm --filter @cdlab996/flox dev
# or from the repo root
pnpm dev:flox
```

Dev server is reachable at `http://flox.localhost:3355` via `@dotns/nsl` — no port hunting.

### Build / Deploy

`flox` builds with **`next build --webpack`** (`build` script) — Turbopack is not used here. Cloudflare Pages deployment goes through `@cloudflare/next-on-pages`:

```bash
pnpm --filter @cdlab996/flox build       # next build --webpack
pnpm --filter @cdlab996/flox build:cf    # npx @cloudflare/next-on-pages@latest
```

## Architecture

| Area | Path | Notes |
|---|---|---|
| Parallel search | `src/app/api/search-parallel/route.ts` | Edge runtime. Reads `{ query, sources, page }` from the request body, fans out one fetch per source with `Promise.all`, and streams SSE frames (`type: 'start' \| 'videos' \| 'progress' \| 'complete' \| 'error'`) as each source resolves or fails |
| Search subscriber | `src/lib/hooks/useParallelSearch.ts` | TanStack `useMutation` reads the SSE stream, merges incoming videos with `binaryInsertVideos`, tracks per-source counts/latency, then sorts and hands results to a cache callback on completion |
| Video proxy | `src/app/api/proxy/route.ts` | Edge runtime. Forwards `cookie`/`range` headers upstream, detects M3U8 by content-type or body sniffing, rewrites manifest URLs via `processM3u8Content`, and adds CORS headers to every response |
| Resolution probing | `src/app/api/probe-resolution/route.ts` | Edge runtime; probes stream resolution server-side |
| Player shell | `src/components/player/VideoPlayer.tsx` | Dispatches to `FloxPlayer` (Volcengine VePlayer) or `CustomVideoPlayer` based on the `playerEngine` setting |
| Custom player chain | `CustomVideoPlayer` → `DesktopVideoPlayer` → `desktop/*` | Device dispatch → orchestrator → control layer (`DesktopControls`, `DesktopProgressBar`, `DesktopVolumeControl`, …) |
| Player state | `hooks/useDesktopPlayerState.ts` + `hooks/useDesktopPlayerLogic.ts` | `refs`/`data`/`actions` container wired over domain hooks in `hooks/desktop/` (playback, volume, progress, skip, fullscreen, controls-visibility, shortcuts) |
| HLS engine | `hooks/useHlsPlayer.ts` | Owns hls.js: HEVC/H.264 level locking, iOS blob-based ad filtering with fallback, direct-to-proxy fallback in unsupported environments |
| Ad filtering | `lib/utils/m3u8-utils.ts` | Heuristic block scoring, keyword matching, SCTE-35 CUE tag state machine, aggressive `DISCONTINUITY` stripping |
| Source registry | `src/lib/api/{client,search-api,detail-api,default-sources,premium-sources,builtin-sources}.ts` | `client.ts` re-exports `searchVideos`/`getVideoDetail`; the curated full source list is hosted remotely and pulled in through `/api/proxy` on import |
| State stores | `src/lib/store/*` | Zustand, each `localStorage`-persisted: `settings-store`, `favorites-store`, `history-store`, `watch-later-store`, `search-history-store`, `unlock-store` (password gate), `sidebar-store`, `tag-orders-store`, `header-reset-store` |
| Premium isolation | `src/components/premium/PremiumContent.tsx`, `lib/hooks/usePremiumContent.ts` | Separate routing/sources/history/favorites from the standard content surface |

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
