# LiveUser

[English](./README.md) | [中文](./README.zh-CN.md)

Real-time online user counter for any website — drop in one script tag, no server setup, no accounts. Built with **Hono + Cloudflare Workers + Durable Objects** (WebSocket Hibernation API + embedded SQLite).

Preview: https://live-user.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/live-user/index.png)

## Features

- **One-line embed** — a single `<script>` tag renders the live online count into any element; add `enableTotalCount=true` for a running total-visits counter alongside it
- **WebSocket Hibernation API** — each `siteId` maps to its own `SiteManager` Durable Object via `ctx.acceptWebSocket()`; connections hibernate when idle so idle sites cost near zero
- **DO-embedded SQLite** — total visit counts persist in the DO's own `visit_counter` table, updated atomically with `INSERT ... ON CONFLICT ... DO UPDATE`
- **Zero-dependency SDK** — `/liveuser.js` serves a single inline IIFE (no external deps), with auto-reconnect, heartbeat pings, and debug logging built in
- **Multi-site** — one worker deployment serves unlimited sites, isolated by `siteId`

## Tech Stack

- **Framework** — Hono
- **Platform** — Cloudflare Workers
- **State** — Durable Objects (WebSocket Hibernation API)
- **Storage** — SQLite embedded in the Durable Object (`new_sqlite_classes`)
- **Pages** — Hono JSX (`hono/jsx`) for the demo page

## Getting Started

### Prerequisites

- Node.js + pnpm (monorepo root)
- A Cloudflare account (for `wrangler deploy`)

### Install

From the monorepo root:

```bash
pnpm install
```

### Development

```bash
pnpm --filter @cdlab996/live-user dev
```

Dev server is available at `http://live-user.localhost:3355` (via `@dotns/nsl` — no port hunting).

Regenerate the Cloudflare bindings types after touching `wrangler.jsonc`:

```bash
pnpm --filter @cdlab996/live-user cf-typegen
```

### Build / Deploy

```bash
pnpm --filter @cdlab996/live-user deploy
```

Runs `wrangler deploy --minify`. Requires the `SITE_MANAGER` Durable Object binding and `account_id` set in `wrangler.jsonc`.

## Usage

```html
<div id="liveuser">0</div>
<script src="https://live-user.cdlab.workers.dev/liveuser.js"></script>
```

With a total visit counter:

```html
<div>Online: <span id="liveuser">0</span></div>
<div>Total: <span id="liveuser_totalvisits">0</span></div>
<script src="https://live-user.cdlab.workers.dev/liveuser.js?enableTotalCount=true"></script>
```

### SDK parameters

| Parameter | Description | Default |
| --- | --- | --- |
| `siteId` | Site identifier | `default-site` |
| `displayElementId` | Element ID for the online count | `liveuser` |
| `totalCountElementId` | Element ID for the total visit count | `liveuser_totalvisits` |
| `enableTotalCount` | Track total visit count | `false` |
| `reconnectDelay` | Reconnect delay (ms) | `3000` |
| `debug` | Enable console logging | `false` |
| `serverUrl` | WebSocket server URL | auto-detected |

## Architecture

| Path | Role |
| --- | --- |
| `src/index.ts` | Entry point — Hono app, global middleware (`logger`, `requestId`), route registration, 404 handler |
| `src/site-manager.ts` | `SiteManager` Durable Object — accepts hibernating WebSockets, derives the online count from `ctx.getWebSockets()`, persists total visits in the embedded `visit_counter` SQLite table |
| `src/routes/home.tsx` | `GET /` — renders the demo page |
| `src/routes/sdk.ts` | `GET /liveuser.js` — builds and serves the embeddable SDK script from query-string config |
| `src/routes/ws.ts` | `GET /ws` — resolves the `SiteManager` DO instance for `siteId` and forwards the WebSocket upgrade |
| `src/pages/Layout.tsx` / `src/pages/HomePage.tsx` | Hono JSX shell + demo page markup |
| `src/types/index.ts` | Shared types: `AppEnv`, `ConnectionState`, `SDKConfig` |

Each `siteId` maps to one `SiteManager` Durable Object instance. Connection state (`clientId`, `siteId`, `enableTotalCount`, `joinedAt`) is stored via `serializeAttachment`/`deserializeAttachment` on the socket itself, so the DO can hibernate between events and still know which site and preferences each connection belongs to on wake. Broadcasts on join/close/error recompute the online count per socket and only attach `totalCount` for connections that opted in via `enableTotalCount`.

> The Hibernation API invokes `webSocketClose` *after* the socket is already closed — `src/site-manager.ts` never calls `ws.close()` from that handler, since doing so throws.

## License

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
