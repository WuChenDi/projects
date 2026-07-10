# dropply-api

[English](./README.md) | [中文](./README.zh-CN.md)

End-to-end encrypted file sharing API — the Cloudflare Workers backend for [`dropply-web`](../dropply-web). Encryption happens entirely in the browser; this service only ever stores ciphertext and metadata, never plaintext or keys. Built with **Hono**, **Drizzle ORM**, and **Cloudflare R2**.

Paired frontend preview: https://dropply.pages.dev/

## Features

- **Session + file model** — a `sessions` row (UUID, optional `retrievalCode`, `expiresAt`) owns one or more `files` rows (`cascade` delete); files are stored as `${sessionId}/${fileId}` objects in an R2 bucket
- **Two upload paths**
  - Direct multipart form upload (`POST /api/chest/:sessionId/upload`) for smaller payloads and inline text snippets
  - R2 native multipart upload (`create` → `part` → `complete`) for large files, gated by a dedicated multipart JWT
- **Retrieval codes** — completing an upload mints a 6-character CSPRNG retrieval code (`generateRetrievalCode`) and an expiry (1–365 days, or permanent if unset)
- **Custom JWTs, no external library** — HMAC-SHA256 tokens signed with Web Crypto (`lib/jwt.ts`): short-lived `upload` (24h) and `multipart` (48h) tokens scope each request to its session/file, and a `chest` token (tied to the retrieval expiry) gates downloads
- **Optional TOTP gate** — when `REQUIRE_TOTP=true`, chest creation requires a valid 6-digit TOTP code checked against one or more secrets in `TOTP_SECRETS` (custom base32 + HMAC-SHA1 implementation, no external TOTP library)
- **Email delivery via Resend** — `POST /api/email/share` sends a self-contained HTML email with the retrieval code and file summary, gated by `ENABLE_EMAIL_SHARE` + `RESEND_API_KEY`
- **Soft delete everywhere** — `sessions` and `files` share `trackingFields` (`createdAt`, `updatedAt`, `isDeleted`); nothing is hard-deleted, all queries filter with `withNotDeleted`
- **Scheduled cleanup** — the Worker's `scheduled()` handler (hourly, see `wrangler.jsonc` `triggers.crons`) runs `cleanupExpiredContent`: purges R2 objects and soft-deletes both expired sessions and incomplete sessions older than 48 hours (matching the multipart JWT window)

## Tech Stack

- **Framework** — Hono
- **Database** — Drizzle ORM over Cloudflare D1 or LibSQL / Turso (selectable via `DB_TYPE`, via `@cdlab/db/node`)
- **Storage** — Cloudflare R2 (`R2_STORAGE` binding), including native multipart upload
- **Validation** — zod + `@hono/zod-validator`
- **Email** — Resend (`resend` + `@react-email/components`)
- **Logging** — winston + winston-daily-rotate-file (console-only under `DEPLOY_RUNTIME=cf`)
- **Platform** — Cloudflare Workers

## Getting Started

### Install

```bash
pnpm install
```

### Development

```bash
# Start the dev server on http://dropply-api.localhost:3355 (via nsl)
pnpm --filter @cdlab/dropply-api dev
```

### Type-check Cloudflare bindings

```bash
pnpm --filter @cdlab/dropply-api cf-typegen
```

### Database

```bash
# Generate a migration from schema.ts
pnpm --filter @cdlab/dropply-api db:gen

# Apply pending migrations (LibSQL / Turso)
pnpm --filter @cdlab/dropply-api db:migrate

# Apply migrations to the local D1 database
pnpm --filter @cdlab/dropply-api cf:localdb

# Apply migrations to the remote D1 database
pnpm --filter @cdlab/dropply-api cf:remotedb

# Open Drizzle Studio (port 3015)
pnpm --filter @cdlab/dropply-api db:studio
```

Copy `.env.example` to `.env` and fill in the database, JWT, TOTP, and Resend settings.

### Deploy

```bash
pnpm --filter @cdlab/dropply-api deploy
```

Requires the `R2_STORAGE` bucket binding, plus the database for the active `DB_TYPE` — the `DB` binding (D1, currently commented out in `wrangler.jsonc`) or `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN` (Turso). See `wrangler.jsonc`.

## Architecture

| Route | File | Purpose |
|---|---|---|
| `POST /api/chest` | `routes/chest.ts` | Create a session, optionally gated by TOTP; returns an `upload` JWT |
| `POST /api/chest/:sessionId/upload` | `routes/chest.ts` | Direct multipart-form upload of files/text into R2 + `files` rows |
| `POST /api/chest/:sessionId/complete` | `routes/chest.ts` | Verify file ownership, mint the retrieval code + expiry |
| `POST /api/chest/:sessionId/multipart/create` | `routes/chest.ts` | Start an R2 multipart upload; returns a `multipart` JWT |
| `PUT /api/chest/:sessionId/multipart/:fileId/part/:partNumber` | `routes/chest.ts` | Upload one part, resuming the R2 multipart upload via the `multipart` JWT |
| `POST /api/chest/:sessionId/multipart/:fileId/complete` | `routes/chest.ts` | Complete the R2 multipart upload, insert the `files` row |
| `GET /api/retrieve/:retrievalCode` | `routes/retrieve.ts` | Resolve a retrieval code to its file list; returns a `chest` JWT |
| `GET /api/download/:fileId` | `routes/download.ts` | Stream a file from R2, authorized by a `chest` JWT (`Authorization: Bearer` or `?token=`) |
| `GET /api/config` | `routes/config.ts` | Expose `requireTOTP`, `emailShareEnabled`, `maxFileSize` to the frontend |
| `POST /api/email/share` | `routes/email.ts` | Send the retrieval code + file summary via Resend |

- `src/index.ts` — Hono app entry. Wires access logging, `prettyJSON`, `requestId`, and open CORS; mounts all route groups under `/api`; exports the Worker's `scheduled()` handler that drives `cleanupExpiredContent`.
- `src/lib/jwt.ts` — Hand-rolled HMAC-SHA256 JWT sign/verify (Web Crypto via `@cdlab/uncrypto`) for the `upload`, `multipart`, and `chest` token types.
- `src/lib/totp.ts` — Hand-rolled TOTP (base32 + HMAC-SHA1, 30s step, ±1 window); `TOTP_SECRETS` is a `name:secret,name2:secret2` list, and `verifyAnyTOTP` accepts a match against any configured secret.
- `src/lib/db.ts` — Thin adapter over `@cdlab/db/node`'s `defineDb`; `useDrizzle(c)` builds a driver from `c.env` per the app's `DB_TYPE`.
- `src/cron/cleanup.ts` — `cleanupExpiredContent(env)`, invoked from `scheduled()`; deletes R2 objects then soft-deletes `files` and `sessions` for both expired and stale-incomplete sessions.
- `src/global.ts` — Sets the global `logger` (winston) and `isDebug` flag, imported for side effects from `index.ts`.

### Response envelopes

Business routes return `ApiResponse<T>` — `{ code: number, message: string, data?: T }` (`code: 0` on success). Uncaught errors and unmatched routes go through the global `onError` / `notFound` handlers in `src/index.ts`, which return `{ statusCode, message, stack? }` (`stack` only when `isDebug` is true).

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DEPLOY_RUNTIME` | `cf` | Runtime preset (`cf` uses console-only logging) |
| `DB_TYPE` | `libsql` | Driver selector — `libsql` (Turso) or `d1` (Cloudflare D1) |
| `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN` | — | LibSQL / Turso connection (used when `DB_TYPE=libsql`) |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | — | Used by drizzle-kit's `d1-http` driver for remote migrations |
| `MAX_FILE_SIZE_MB` | `100` | Max file size reported by `GET /api/config` |
| `REQUIRE_TOTP` | `false` | Require a TOTP token to create a chest session |
| `TOTP_SECRETS` | — | `name:secret,name2:secret2` list of base32 TOTP secrets |
| `JWT_SECRET` | — | HMAC secret for the `upload` / `multipart` / `chest` JWTs |
| `ENABLE_EMAIL_SHARE` | `false` | Enable `POST /api/email/share` |
| `RESEND_API_KEY` | — | Resend API key |
| `RESEND_FROM_EMAIL` | `noreply@resend.dev` | Sender address for share emails |
| `RESEND_WEB_URL` | — | Public `dropply-web` URL used to build retrieval links in the email |

See `.env.example` and `wrangler.jsonc` for the full set of defaults. The R2 bucket binding is `R2_STORAGE` (bucket name `dropply`); the (currently commented out) D1 binding is `DB`, database name `dropply`.

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
