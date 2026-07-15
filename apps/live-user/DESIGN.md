# live-user — Design

> A real-time online-visitor counter as a single Cloudflare Worker fronting one
> **Durable Object per site**. The "online" number is never stored — it is
> derived live from the count of open WebSockets on the site's DO, so it is
> always exact and self-healing. Only an opt-in **total-visits** counter is
> persisted, in SQLite embedded inside that same DO. Connection state rides on
> the socket itself (`serializeAttachment`), so the DO can hibernate while idle
> and still recover per-connection preferences on wake.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — source comments and reviews reference them as
`design §N`.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The connection lifecycle](#3-the-connection-lifecycle)
4. [The SiteManager Durable Object](#4-the-sitemanager-durable-object)
5. [Broadcast & counting](#5-broadcast--counting)
6. [Data model & storage](#6-data-model--storage)
7. [The embeddable SDK](#7-the-embeddable-sdk)
8. [Configuration & deployment](#8-configuration--deployment)

---

## 1. Background & goals

Showing "N people online" is deceptively hard to do *well*: a naive
increment-on-connect / decrement-on-disconnect counter drifts the moment a
disconnect is missed (a crashed tab, a dropped socket, a server restart), and
holding every open socket in a single long-lived process does not scale or
survive redeploys. Hosted analytics vendors solve the operational side by
tracking your visitors for their own product.

`live-user` takes a different path — a single Cloudflare Worker you deploy to
your own account — and holds itself to these goals:

- **G1 — Accurate by construction.** "Online" is a *derived* quantity
  (`ctx.getWebSockets().length`), never an incrementally-maintained counter, so
  it cannot drift out of sync with reality.
- **G2 — Cheap when idle.** A site with open-but-quiet connections must not pin a
  process in memory. The WebSocket Hibernation API evicts the DO while idle and
  restores it on the next event.
- **G3 — One embed, zero dependencies.** Integration is a single `<script>` tag;
  the SDK ships as an inline IIFE with nothing to install or bundle.
- **G4 — Multi-tenant from one deploy.** Each `siteId` gets an isolated,
  strongly-consistent DO with no shared mutable state and no per-site config.
- **G5 — No accounts, no cookies.** Nothing is set on the visitor; the only
  identity is a per-tab client-generated UUID.

### Non-goals

- **Not unique-visitor analytics.** The persisted total counts opted-in
  *connections*, not distinct people. It is deliberately connection-count, not a
  deduplicated visitor metric.
- **Not authenticated or rate-limited.** `/liveuser.js` and `/ws` are fully open
  (`Access-Control-Allow-Origin: *`); any origin may connect to any `siteId`.
- **Not a time-series / history store.** The online count reflects *now* only —
  no retention, dashboard, or export. The only durable state is one integer per
  site.

---

## 2. Architecture

Two tiers share one Worker: a **stateless Hono front** (routing, SDK, HTML) and a
**stateful `SiteManager` Durable Object** (one instance per `siteId`) that owns
the WebSockets and the SQLite counter.

```
                         Cloudflare edge
  browser ── GET /liveuser.js ──►┌──────────────────────────────────┐
                                 │ src/index.ts (Hono Worker)        │
  browser ── wss  /ws ──────────►│  logger + requestId middleware    │
                                 │  homeRoutes · sdkRoutes · wsRoutes │
                                 └───────────────┬───────────────────┘
                                                 │ idFromName(siteId)
                                                 ▼
                                 ┌──────────────────────────────────┐
                                 │ SiteManager DO  (one per siteId)  │
                                 │  acceptWebSocket (Hibernation)    │
                                 │  getWebSockets() → online count   │
                                 │  SQLite: visit_counter (totals)   │
                                 └──────────────────────────────────┘
```

**Worker entry (`src/index.ts`).** A `Hono<{ Bindings: AppEnv }>` app with two
global middlewares — `logger()` and `requestId()` — and all three route modules
mounted at `/` (`homeRoutes`, `sdkRoutes`, `wsRoutes`). Unmatched paths return
JSON `{ statusCode: 404, message: 'Not Found' }`. The default export is
`{ fetch: app.fetch }`. Critically, the file **re-exports the DO class**
(`export { SiteManager } from './site-manager'`) — Wrangler needs the class
exported from the Worker's main module to bind it.

**Deterministic sharding.** `wsRoutes` resolves the DO with
`SITE_MANAGER.idFromName(siteId)` (`src/routes/ws.ts`). `idFromName` maps a name
to a *stable* DO id, so a `siteId` always lands on the **same single-threaded,
strongly-consistent** instance. That is what lets the SQLite increment need no
external locking — concurrency is serialized by the DO model itself.

**Deploy target.** Cloudflare Workers + Durable Objects, `nodejs_compat`
(`wrangler.jsonc`). No KV / R2 / D1 / queues, no secrets, no runtime env vars.

---

## 3. The connection lifecycle

A visitor connecting and the count updating, end to end:

1. **Load the SDK.** The browser fetches `/liveuser.js` (optionally with query
   config). `sdkRoutes` parses the query into an `SDKConfig` (`parseConfig`) and
   returns the `SDK_SCRIPT` IIFE with the config JSON-injected. Served as
   `application/javascript; charset=utf-8`, `Cache-Control: no-cache`,
   `Access-Control-Allow-Origin: *`.
2. **Open the socket.** The IIFE generates a UUID `clientId` client-side, finds
   `displayElementId` in the DOM, and opens
   `wss://host/ws?siteId=…&clientId=…[&enableTotalCount=true]`. The ws URL is
   derived by `serverUrl.replace(/^http/, 'ws')`, so `http→ws` / `https→wss`. On
   open it sends `{ type: 'join' }` and starts a **30s heartbeat** interval.
3. **Resolve the DO (`GET /ws`, `wsRoutes`).** `idFromName(siteId)` → one stub,
   then the **raw upgrade request** is forwarded (`stub.fetch(url, c.req.raw)`).
   The forwarder rewrites only `clientId` and `enableTotalCount` into the URL —
   **not** `siteId`, which the DO re-reads from the still-present original query.
4. **Accept in the DO (`SiteManager.fetch`).** Non-`/ws` paths → 404. Otherwise
   it creates a `WebSocketPair`, calls **`ctx.acceptWebSocket(server)`**
   (Hibernation API), builds a `ConnectionState`, and stores it on the socket via
   **`server.serializeAttachment(state)`**. If `enableTotalCount`, it increments
   the SQLite counter, then `broadcast(siteId)` and returns `101` with the client
   socket.
5. **Messages (`webSocketMessage`).** State recovered via
   `ws.deserializeAttachment()`. `heartbeat` → reply with the live online count
   (plus `totalCount` if this socket opted in); `join` → trigger `broadcast`.
   Malformed / non-string messages are ignored.
6. **Disconnect / error.** `webSocketClose` and `webSocketError` both
   re-`broadcast` so the remaining clients see the reduced count (see §4.2).
7. **Client render.** The SDK's `update()` formats numbers (K/M thresholds) and
   writes `textContent` plus `data-live-count` / `data-total-count` attributes.

---

## 4. The SiteManager Durable Object

`src/site-manager.ts` — the entire stateful core, a
`DurableObject<Record<string, unknown>>`. Everything except this file is stateless.

### 4.1 Hibernation & per-socket state

The DO uses the **WebSocket Hibernation API**: `ctx.acceptWebSocket(server)` hands
the socket to the runtime, which may **evict the DO from memory** whenever no
event is in flight and wake it on the next message/close/error. For that to work,
two rules are load-bearing:

- **State lives on the socket, not in the instance.** Per-connection data
  (`ConnectionState = { clientId, siteId, enableTotalCount, joinedAt }`) is
  written with `serializeAttachment(state)` and read back with
  `deserializeAttachment()` on every event. No connection map is held on the DO,
  because the DO object is not guaranteed to survive between events.
- **Handlers are top-level DO methods**, not closures registered at accept time
  (`webSocketMessage` / `webSocketClose` / `webSocketError`). The Hibernation API
  dispatches to these named methods on wake — an inline closure would be gone
  after eviction.

The schema is created idempotently in the constructor under
`ctx.blockConcurrencyWhile` (§6), so a freshly-woken instance always has its
table before serving.

### 4.2 The load-bearing close fix

`webSocketClose` fires **after** the socket is already closed. It must **not**
call `ws.close()` — that throws. The handler therefore only reads the attachment
and re-broadcasts. Contrast `webSocketError`, which *does* call
`ws.close(1011, 'WebSocket error')` (the socket is still open there) and then
broadcasts. Getting this wrong surfaces as intermittent DO exceptions under
disconnect churn.

### 4.3 Why derived, not stored, online counts

The online count is `ctx.getWebSockets().length` — computed at read time from the
sockets the runtime currently holds. There is no counter to increment on connect
or decrement on disconnect, so a missed disconnect, a crashed tab, or a DO
eviction can never leave a phantom. The count is self-healing and needs no
cleanup job.

---

## 5. Broadcast & counting

`broadcast(siteId)` (`src/site-manager.ts`) is the fan-out. It computes the online
count once, reads the site's total once, then iterates **every** socket from
`ctx.getWebSockets()`:

- Each recipient's payload is `{ type: 'update', count }`.
- `totalCount` is attached **only if that recipient's own attachment** has
  `enableTotalCount` — read from `client.deserializeAttachment()`, *not* from the
  connection that triggered the broadcast. This is a deliberate fidelity fix: a
  client that opted out must never receive a `totalCount`, even when a different,
  opted-in client caused the broadcast.
- A `send` that throws (client already gone) is swallowed — the loop continues.

The heartbeat reply path in `webSocketMessage` mirrors this per-socket rule: it
attaches `totalCount` only when the *replying* socket's own `state.enableTotalCount`
is set.

Broadcasts are triggered on: accept (`fetch`), an explicit `join` message, and
every close/error. Between broadcasts, the 30s client heartbeat also refreshes
each client's number (and keeps the socket — and thus the online count — alive).

---

## 6. Data model & storage

SQLite is embedded **inside the DO** (`new_sqlite_classes: ["SiteManager"]`,
`wrangler.jsonc`). A single table is created idempotently in the constructor
under `ctx.blockConcurrencyWhile`:

```sql
CREATE TABLE IF NOT EXISTS visit_counter (
  site_id TEXT PRIMARY KEY,
  count   INTEGER NOT NULL DEFAULT 0
);
```

| Operation | Statement | Notes |
| --- | --- | --- |
| Read total | `getTotalCount` | `SELECT count FROM visit_counter WHERE site_id = ?`; missing row → `0`. |
| Increment | `incrementTotalCount` | `INSERT … VALUES(?,1) ON CONFLICT(site_id) DO UPDATE SET count = count + 1` — atomic upsert; first hit seeds `1`. |

Two properties fall out of the design:

- **Online count is not stored** — derived live (§4.3). Only `visit_counter`
  persists, and only for `siteId`s that have ever had an `enableTotalCount`
  connection.
- **No external locking.** Because one `siteId` maps to one single-threaded DO
  (§2), the atomic `ON CONFLICT` upsert already serializes under the DO model —
  there is no cross-instance contention to guard against.

Since a DO instance is a table (keyed by `site_id`), a single DO could in
principle hold rows for several sites; in practice `idFromName(siteId)` gives
each site its own instance, so each `visit_counter` table holds exactly the one
row for its site.

---

## 7. The embeddable SDK

`src/routes/sdk.ts` serves `GET /liveuser.js`. The SDK is a **hand-minified,
zero-dependency IIFE** (`SDK_SCRIPT`) invoked with a JSON config object that
`parseConfig` builds from the request query.

### 7.1 Config

`parseConfig(url, query)` produces an `SDKConfig`. Defaults: `serverUrl` =
`ws(s)://<host>/` (protocol chosen from the request scheme), `siteId` =
`default-site`, `displayElementId` = `liveuser`, `totalCountElementId` =
`liveuser_totalvisits`, `reconnectDelay` = `3000`, `debug` = `false`,
`enableTotalCount` = `false`. Full table in the
[README](README.md#sdk-parameters). Response headers: `no-cache` (config edits
take effect immediately) and `Access-Control-Allow-Origin: *` (embeddable from
any origin).

### 7.2 Client behaviour

- **Identity.** A UUID `clientId` is generated in-browser per tab; there is no
  cookie and no server-assigned id.
- **Connect / URL munging.** The ws URL is `serverUrl.replace(/^http/, 'ws')`
  with a trailing slash stripped, then `/ws?siteId=…&clientId=…`
  (`&enableTotalCount=true` when opted in).
- **Heartbeat.** Every 30s the client sends `{ type: 'heartbeat' }`; the reply
  refreshes the displayed number and keeps the socket (and thus the online count)
  alive.
- **Auto-reconnect.** On an unexpected close the client retries after
  `reconnectDelay` ms. A `beforeunload` handler sets an internal `closing` flag
  and closes the socket cleanly, so a navigating-away tab does **not** trigger a
  reconnect.
- **Rendering.** `fmt()` compresses to `K`/`M` above 1e3 / 1e6; `update()` writes
  `textContent` and `data-*` attributes for the online (and, if opted in, total)
  elements.
- **Debug.** With `debug=true` the SDK emits styled `console.log` traces.

### 7.3 Demo page

`homeRoutes` (`GET /`) renders `<HomePage>` via Hono JSX inside `Layout.tsx`
(SEO/OG/Twitter meta, JSON-LD, inline CSS). `HomePage.tsx` embeds its own live
counter (`<script src="/liveuser.js?siteId=official-website&enableTotalCount=true">`),
so the homepage is a self-demo on `siteId=official-website`.

> **Doc discrepancy to correct.** `Layout.tsx` SEO copy and JSON-LD reference
> "SSE", but the transport is **WebSockets**, not Server-Sent Events. Treat the
> WebSocket path as the source of truth.

---

## 8. Configuration & deployment

### 8.1 Bindings & env

The only binding is the Durable Object `SITE_MANAGER` → class `SiteManager`
(`wrangler.jsonc`; typed as `AppEnv` in `src/types/index.ts`). There are **no
secrets and no runtime env vars**. Observability is enabled with
`head_sampling_rate: 1`. Migration tag `v1` registers `SiteManager` as a
SQLite-backed DO class.

`account_id` is **empty** in `wrangler.jsonc` and must be set before deploying.

### 8.2 Hard-coded knobs

Two values are not query-configurable and live in the SDK
(`src/routes/sdk.ts`): the **30s heartbeat interval** and the **K/M number
formatting thresholds**. Change them in the IIFE string if needed.

### 8.3 Scripts & deploy

`package.json` (`@cdlab/live-user`):

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `nsl run wrangler dev src/index.ts` | Local dev at `http://live-user.localhost:3355` via `@dotns/nsl`. |
| `deploy` | `wrangler deploy --minify` | Ship to Cloudflare Workers. |
| `build` | `bun build src/index.ts --outdir dist --target browser` | Present, but the real deploy path is `wrangler deploy`. |
| `cf-typegen` | `wrangler types --env-interface CloudflareBindings` | Regenerate binding types after editing `wrangler.jsonc`. |

There is **no test script and no test suite**. The only dependency is `hono`
(`catalog:prod`); dev deps are `@cdlab/tsconfig`, `@cloudflare/workers-types`,
and `wrangler`. `tsconfig.json` extends `@cdlab/tsconfig/hono.json`, adds the
`webworker` lib, and aliases `@/*` → `./src/*`.
