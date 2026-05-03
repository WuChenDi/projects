# shortener

[中文文档](./README.zh-CN.md)

A URL shortener service built with [Hono](https://hono.dev/) on Cloudflare Workers — D1/LibSQL storage via Drizzle, KV caching, JWT-protected admin API, AI-powered slug generation, and Analytics Engine reporting.

## Features

- **Edge runtime** — Hono on Cloudflare Workers
- **Pluggable storage** — Cloudflare D1 or LibSQL/Turso, switched at config time via `DB_TYPE`
- **JWT (ES256) admin API** — `/api/*` routes guarded by `Authorization: Bearer <jwt>`; public-key configured via `JWT_PUBKEY`
- **KV caching** — `url:{hash}`, `og:{hash}`, `ai:slug:{url}` cache keys with auto-invalidation on update/delete
- **AI slug generation** — semantic short codes via Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct` by default), with KV cache and Base62 fallback
- **Analytics Engine** — request-time analytics ingestion plus query endpoints (overview / time series / countries / referrers / devices / browsers / OS / per-link / real-time)
- **OG-tag rendering** — auto-detects social-media crawlers and serves OG metadata
- **Cron cleanup** — daily soft-delete of expired links plus paired cache invalidation
- **Soft delete** — `isDeleted` flag on every table, never hard-deletes

## Development

```bash
pnpm dev:shortener
```

Served at `http://shortener.localhost:3355` via `nsl`.

## Deploy

```bash
pnpm deploy:shortener
```

## Database

```bash
# Generate migration from schema
pnpm --filter @cdlab996/shortener db:gen

# Apply migrations to local D1
pnpm --filter @cdlab996/shortener cf:localdb

# Apply to remote D1
pnpm --filter @cdlab996/shortener cf:remotedb

# Drizzle Studio (port 3019)
pnpm --filter @cdlab996/shortener db:studio
```

`DB_TYPE` env var selects the dialect at config time (see `drizzle.config.ts`):

- `d1` (default in `wrangler.jsonc`) — Cloudflare D1 via `drizzle-kit … --driver d1-http`
- `libsql` — LibSQL/Turso, defaults to `file:./src/database/data.db`

## Configuration

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `DEPLOY_RUNTIME` | `cf` or `node` (selects logger backend) | `cf` |
| `DB_TYPE` | `d1` or `libsql` | `d1` |
| `LIBSQL_URL` | LibSQL/Turso URL (LibSQL mode) | `file:./src/database/data.db` |
| `LIBSQL_AUTH_TOKEN` | LibSQL auth token | — |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account (for drizzle-kit + Analytics queries) | — |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | — |
| `JWT_PUBKEY` | Hex-encoded ES256 public key (uncompressed EC point) | — |
| `ENABLE_AI_SLUG` | Enable AI slug generation | `true` |
| `AI_MODEL` | Workers AI model id | `@cf/meta/llama-3.1-8b-instruct` |
| `AI_ENABLE_CACHE` | Cache AI-generated slugs in KV | `true` |
| `AI_MAX_RETRIES` | AI retry count | `3` |
| `AI_TIMEOUT` | AI timeout (ms) | `10000` |
| `ANALYTICS_DATASET` | Analytics Engine dataset name | `shortener_analytics` |
| `ANALYTICS_SAMPLE_RATE` | Analytics sampling rate | `1.0` |
| `DISABLE_BOT_ANALYTICS` | Skip bot traffic in analytics | `false` |

### One-time Setup

```bash
# Generate ES256 key pair — copy the printed hex public key into JWT_PUBKEY
pnpm --filter @cdlab996/shortener generate-jwt

# Create D1 database — copy the returned id into d1_databases[0].database_id
wrangler d1 create shortener-db

# Create KV namespace — copy the returned id into kv_namespaces[0].id
wrangler kv namespace create SHORTENER_KV
```

The Analytics Engine dataset is auto-provisioned by `wrangler.jsonc → analytics_engine_datasets`.

### Cron Schedule

```jsonc
"triggers": { "crons": ["0 0 * * *"] }   // daily at 00:00 UTC
```

The cron handler runs `cleanupExpiredLinks` — soft-deletes rows where `expiresAt < now()` and clears their `url:{hash}` / `og:{hash}` / `ai:slug:{url}` cache entries.

## HTTP API

All `/api/*` routes require `Authorization: Bearer <jwt>` (ES256). Use `pnpm --filter @cdlab996/shortener generate-jwt` to mint a test token.

### Public

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Service health check |
| `GET` | `/:shortCode` | Redirect or OG page (auto-detect crawler) |
| `GET` | `/:shortCode/og` | Force OG metadata page |

### Link Management

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/url` | List links (`?isDeleted=0\|1`) |
| `POST` | `/api/url` | Batch create short links |
| `PUT` | `/api/url` | Batch update (by `hash`) |
| `DELETE` | `/api/url` | Batch soft-delete (by `hashList`) |
| `POST` | `/api/page` | Create a page record |

### AI

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/ai/slug` | Generate semantic slug for a URL |
| `POST` | `/api/ai/batch-slug` | Batch generate slugs (max 10 URLs) |
| `GET` | `/api/ai/suggestions` | Get N slug candidates for a URL |

### Analytics

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/analytics/overview` | Aggregate metrics |
| `GET` | `/api/analytics/timeseries` | Time-series clicks / unique visitors |
| `GET` | `/api/analytics/top-countries` | Country breakdown |
| `GET` | `/api/analytics/top-referrers` | Referrer breakdown |
| `GET` | `/api/analytics/devices` | Device-type breakdown |
| `GET` | `/api/analytics/browsers` | Browser breakdown |
| `GET` | `/api/analytics/operating-systems` | OS breakdown |
| `GET` | `/api/analytics/link/:hash` | Per-link analytics |
| `GET` | `/api/analytics/real-time` | Active visitors / last-24h activity |

Responses use the envelope `{ code, message, data? }`; errors emit `{ statusCode, message, stack? }` (`stack` only when `isDebug`).

## Project Structure

```
src/
  index.ts              # Hono entry, middleware, route registration
  global.ts             # Logger + isDebug globals
  cron/
    cleanup.ts          # Daily cleanup of expired links
  database/
    schema.ts           # Drizzle schema (links, pages)
    *.sql               # Generated migrations
  lib/
    db.ts               # useDrizzle (D1 / LibSQL switch)
    db-utils.ts         # Soft-delete helpers
  middleware/
    jwt.ts              # ES256 JWT verification
    analytics.ts        # Analytics Engine ingestion
  routes/
    shortcode.ts        # GET /:shortCode (redirect / OG)
    api.ts              # /api/url CRUD + /api/page
    ai.ts               # /api/ai/slug, batch-slug, suggestions
    analytics.ts        # /api/analytics/*
  utils/
    hash.ts             # Base62 short-code + sha256 hash
    slug.ts             # Workers AI slug generation
    analytics.ts        # SQL builders for Analytics Engine
    html.ts             # OG-tag HTML rendering
    validationSchemas.ts # Zod request schemas
  types/index.ts        # Shared types (CloudflareEnv, Variables, …)
```

## Database Schema

### `links`

| Field | Type | Description |
| --- | --- | --- |
| `id` | INTEGER | Primary key, auto-increment |
| `url` | TEXT | Target URL |
| `userId` | TEXT | User identifier |
| `hash` | TEXT | Internal SHA-256 hash (unique) |
| `shortCode` | TEXT | User-facing short code |
| `domain` | TEXT | Domain (multi-tenant support) |
| `expiresAt` | INTEGER | Expiration timestamp (ms) |
| `attribute` | BLOB | Additional JSON attributes |
| `createdAt` | INTEGER | Auto-tracked |
| `updatedAt` | INTEGER | Auto-tracked |
| `isDeleted` | INTEGER | Soft-delete flag (0/1) |

Indexes: `links_hash` (unique on `hash`), `links_short_code_domain` (unique on `shortCode + domain`).

### `pages`

| Field | Type | Description |
| --- | --- | --- |
| `id` | INTEGER | Primary key, auto-increment |
| `userId` | TEXT | User identifier |
| `template` | TEXT | Page template name |
| `data` | BLOB | Page payload |
| `hash` | TEXT | Unique page hash |
| `expiresAt` | INTEGER | Expiration timestamp (ms) |
| `attribute` | BLOB | Additional attributes |
| `createdAt` | INTEGER | Auto-tracked |
| `updatedAt` | INTEGER | Auto-tracked |
| `isDeleted` | INTEGER | Soft-delete flag (0/1) |

Index: `pages_hash` (unique on `hash`).

## License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
