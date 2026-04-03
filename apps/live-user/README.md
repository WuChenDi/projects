# LiveUser

[中文文档](./README.zh-CN.md)

Real-time online user counter for any website. Drop a script tag, see who's here.

Built with [Hono](https://hono.dev/) + Cloudflare Workers + Durable Objects (WebSocket Hibernation API + SQLite).

## Usage

```html
<div id="liveuser">0</div>
<script src="https://live-user.cdlab.workers.dev/liveuser.js"></script>
```

With total visit counter:

```html
<div>Online: <span id="liveuser">0</span></div>
<div>Total: <span id="liveuser_totalvisits">0</span></div>
<script src="https://live-user.cdlab.workers.dev/liveuser.js?enableTotalCount=true"></script>
```

## Parameters

| Parameter | Description | Default |
| --- | --- | --- |
| `siteId` | Site identifier | `default-site` |
| `displayElementId` | Element ID for online count | `liveuser` |
| `totalCountElementId` | Element ID for total visits | `liveuser_totalvisits` |
| `enableTotalCount` | Track total visit count | `false` |
| `reconnectDelay` | Reconnect delay (ms) | `3000` |
| `debug` | Enable console logging | `false` |
| `serverUrl` | WebSocket server URL | auto-detected |

## Development

```bash
pnpm dev:live-user
```

## Deploy

```bash
pnpm deploy:live-user
```

## Project Structure

```
src/
  index.ts              # Entry point, middleware, route registration
  site-manager.ts       # Durable Object (Hibernation API + SQLite)
  types/index.ts        # Shared type definitions
  routes/
    index.ts            # Barrel exports
    home.tsx            # GET /
    sdk.ts              # GET /liveuser.js
    ws.ts               # GET /ws
  pages/
    Layout.tsx          # HTML shell
    HomePage.tsx        # Demo page
```

## How It Works

- Each `siteId` maps to a Durable Object instance
- WebSocket connections are managed via the [Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) — the DO hibernates when idle
- Total visit count is stored in the DO's embedded SQLite (atomic `INSERT ... ON CONFLICT` updates)
- The JS SDK is served as a single inline IIFE from `/liveuser.js`

## License

[MIT](./LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
