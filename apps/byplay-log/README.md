# ByPlay Log

[English](./README.md) | [中文](./README.zh-CN.md)

Log ingest service for the [ByPlay](https://byplay.pages.dev/) video player — a single-endpoint Cloudflare Worker that validates, enriches, and persists client-side playback telemetry. Built with **Hono** and **Drizzle ORM**.

Preview: https://byplay.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png)

## Features

- **Single ingest endpoint** (`POST /monitor?bury_content=<tag>`) — accepts a batch (array) of player log events per request
- **Schema validation** — each event is validated with `zod` before insertion; malformed payloads return a `400` with the parsing errors, not a partial write
- **Request enrichment** — captures `CF-Connecting-IP` / `X-Forwarded-For` / `X-Real-IP`, `User-Agent`, and `CF-IPCountry` server-side, so the client never needs to self-report them
- **Flexible event shape** — `feature`, `playerConfig`, `vplayerRuntime`, `playerRuntime`, and `executeProgressInfos` are stored as JSON columns, so the schema doesn't need to change as the player adds new runtime fields
- **CORS locked down** — only `https://byplay.pages.dev` and `http://localhost:3016` are allowed origins
- **Structured logging** — winston with daily rotation; every request is access-logged, and DB/validation failures are logged with full context
- **Global error/404 handlers** — consistent `{ code, message }` JSON envelope for all failure paths

## Tech Stack

- **Framework** — Hono
- **Database** — Drizzle ORM over Cloudflare D1 or LibSQL / Turso (selectable via `DB_TYPE`)
- **Validation** — zod
- **Logging** — winston + winston-daily-rotate-file
- **Platform** — Cloudflare Workers

## Getting Started

### Install

```bash
pnpm install
```

### Development

```bash
# Start the dev server on http://byplay-log.localhost:3355 (via nsl)
pnpm --filter @cdlab/byplay-log dev
```

### Type-check Cloudflare bindings

```bash
pnpm --filter @cdlab/byplay-log cf-typegen
```

### Database

```bash
# Generate a migration from schema.ts
pnpm --filter @cdlab/byplay-log db:gen

# Apply migrations to the local D1 database
pnpm --filter @cdlab/byplay-log cf:localdb

# Apply migrations to the remote D1 database
pnpm --filter @cdlab/byplay-log cf:remotedb

# Open Drizzle Studio (port 3018)
pnpm --filter @cdlab/byplay-log db:studio
```

Copy `.env.example` to `.env` and fill in the database credentials for your `DB_TYPE`.

### Deploy

```bash
pnpm --filter @cdlab/byplay-log deploy
```

Requires a Cloudflare D1 database bound as `DB` (see `wrangler.jsonc`), or `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN` if `DB_TYPE=libsql`.

## Architecture

- `src/index.ts` — Hono app entry. Wires access logging, `prettyJSON`, `requestId`, and CORS (`https://byplay.pages.dev` + `http://localhost:3016`); mounts `monitorRoutes` at `/`; global `onError` / `notFound` handlers return `{ code, message, stack? }` (`stack` only when `isDebug`).
- `src/routes/monitor.ts` — The only business route: `POST /monitor`. Requires a `bury_content` query parameter, parses and validates the JSON body (an array of player log events) against a zod schema, enriches each row with request metadata, and batch-inserts into `playerLogs`.
- `src/database/schema.ts` — `playerLogs` table (auto-increment `id`). Core fields (`userId`, `userIdUuid`, `streamId`, `topicId`, `time`, `version`, `ua`, `vendor`, `platform`) plus JSON columns (`feature`, `playerConfig`, `vplayerRuntime`, `playerRuntime`, `executeProgressInfos`) for flexible event shapes, and request metadata (`buryContent`, `ipAddress`, `userAgent`, `country`). Indexes on `userId`, `streamId`, `time`, `buryContent`, `createdAt`, and the composite `(userId, streamId)`.
- `src/global.ts` — Sets up the global `logger` (winston) and `isDebug` flag, imported for side effects from `index.ts`.

## Configuration

| Variable | Description |
|---|---|
| `DEPLOY_RUNTIME` | Runtime preset for deployment (`cf` or `node`) |
| `DB_TYPE` | Driver selector — `libsql` (Turso) or `d1` (Cloudflare D1) |
| `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN` | LibSQL / Turso connection (used when `DB_TYPE=libsql`) |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | Used by drizzle-kit for remote D1 migrations |

See `.env.example` and `wrangler.jsonc` for the full set of defaults.

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
