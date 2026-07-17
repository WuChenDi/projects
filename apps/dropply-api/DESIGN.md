# dropply-api — Design

> A zero-knowledge file-sharing backend on Cloudflare Workers. Encryption happens
> entirely in the browser (`dropply-web`); this Worker only ever stores and
> returns **ciphertext**. A share is a **session** (a UUID owning one or more
> files) unlocked by an **8-character retrieval code**; access is a short-lived,
> session-scoped signed token, never a login; and every share is swept from R2
> and soft-deleted from the database once it expires.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — source comments and reviews reference them as
`design §N`. It is the server half of the Dropply pair: `dropply-web` owns all
cryptography (keys/passwords are shared out-of-band, never sent anywhere);
`dropply-api` is a blind blob store with a capability gate.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The share lifecycle](#3-the-share-lifecycle)
4. [The token model](#4-the-token-model)
5. [Upload paths](#5-upload-paths)
6. [Data model & storage](#6-data-model--storage)
7. [Cleanup & expiry](#7-cleanup--expiry)
8. [Auxiliary services (share password, email, config)](#8-auxiliary-services-share-password-email-config)
9. [Security model](#9-security-model)
10. [Configuration & deployment](#10-configuration--deployment)

---

## 1. Background & goals

A file-drop service is trivial to stand up and hard to make *trustworthy*: the
naïve design has the server holding both the bytes and (often) the key, so "we
can't read your files" is a promise, not a property. Dropply splits the problem —
`dropply-web` does all encryption in the browser and the key/password travels
out-of-band (never in a URL, never sent to the server); `dropply-api` is what's
left: a store that holds ciphertext it cannot decrypt, gated by a capability it
hands out on demand.

Goals:

- **G1 — Blind by construction.** The server has no decrypt path and never
  receives a key. It stores and returns opaque bytes; a full database + R2 dump
  reveals nothing without the passwords / private keys held only by participants.
- **G2 — Capability access, not accounts.** No user table, no login. A share is
  reachable only via its retrieval code, which mints a token scoped to exactly
  one session and bounded by that session's expiry.
- **G3 — Bounded lifetime.** Shares expire; abandoned uploads are reclaimed.
  Storage must not accrete — an hourly cron is the garbage collector.
- **G4 — Edge-native, dependency-light.** Runs as a single Worker. Auth
  primitives (HS256 JWT, constant-time password compare) are hand-rolled over
  Web Crypto so there is no Node crypto and no auth library on the critical
  path. Write/read entry points are per-IP rate-limited (chest 20/min,
  retrieve 30/min).
- **G5 — Two upload paths, one shape.** Small payloads and multi-gigabyte files
  both end as identical `files` rows keyed `${sessionId}/${fileId}`.

### Non-goals

- **Not multi-tenant / no accounts.** There is no per-user isolation and no
  identity beyond possession of a retrieval code and its token.
- **Not a crypto engine.** The server never encrypts or decrypts; changing that
  would break G1. All ciphertext handling is `dropply-web`'s.
- **Not durable storage.** Shares are meant to expire. Permanent shares
  (`expiresAt = NULL`) exist but are the exception, not the model.
- **Not origin-restricted.** CORS is intentionally open (§9) — it is a public
  capability API.

---

## 2. Architecture

```
                         Cloudflare edge
  client ─── POST /api/chest ───►┌──────────────────────────────────────┐
  (dropply-web,                  │ src/index.ts  (Hono app)             │
   holds the key)                │  fetch     → /api route groups        │
  client ─── GET  /api/download ►│  scheduled → hourly cleanup           │
                                 └────────┬──────────────────┬───────────┘
                                          │                  │
                                   D1 / libSQL          R2 (R2_STORAGE)
                                   (sessions, files      (ciphertext blobs,
                                    — metadata only)      ${sessionId}/${fileId})
                                          │
                                   Resend (optional: share email)
```

**Entry.** `src/index.ts` builds `new Hono<{ Bindings: CloudflareEnv }>()` and
`export default { fetch: app.fetch, async scheduled(...) }` — one module is both
the request handler and the cron handler. The global middleware chain, in order,
is `accesslog` (Hono `logger` routed into the global winston `logger`) →
`prettyJSON` → `requestId` → open `cors()`. Five route groups mount under `/api`;
`GET /` is a static status JSON.

**Error envelope.** `app.onError` returns `{ statusCode, message, stack? }` —
`HTTPException`s keep their status, everything else is `500`; `stack`
(line-split) is included only when `isDebug`. `app.notFound` returns a `404`
envelope. Business handlers instead return `ApiResponse<T>` =
`{ code, message, data? }` with `code: 0` on success (note: `code` is an
app-level status, distinct from the HTTP status).

**Dual driver.** `DB_TYPE` selects D1 (the `DB` binding) or libSQL/Turso
(`LIBSQL_URL` + token) via `@cdlab/db/node`'s `defineDb(schema)`. `useDrizzle(c)`
(`src/lib/db.ts`) reads the four DB fields off `c.env` and returns a keyed-cached
`getDb`. The Node entry (`@cdlab/db/node`, `@libsql/client`) is correct here
because this is a plain-wrangler Hono worker, not an OpenNext bundle.

**Logging split.** `src/global.ts` sets `globalThis.logger` and
`globalThis.isDebug` at module load. Under `DEPLOY_RUNTIME === 'cf'` it is a
console-only shim (Workers has no writable FS); otherwise it is a full winston
logger with a `winston-daily-rotate-file` transport writing
`logs/dropply-%DATE%.log`. `isDebug = process.env.NODE_ENV === 'dev'`. Both
`DEPLOY_RUNTIME` and `NODE_ENV` are read from `process.env` at load, which relies
on `nodejs_compat` surfacing wrangler `vars` — a deliberate edge coupling.

---

## 3. The share lifecycle

The canonical flow is create → upload → complete → retrieve → download. Each step
below cites the handler in `src/routes/chest.ts` unless noted.

```
POST /api/chest                          [rate-limited 20/min; password gate if SHARE_PASSWORD]
  → constantTimeEqual(body.password, SHARE_PASSWORD)   when the secret is set
  → generateUUID() = sessionId
  → createUploadJWT(sessionId)           upload JWT, 24h
  → insert sessions { id, uploadComplete: 0 }
  → { sessionId, uploadToken, expiresIn: 86400 }

POST /api/chest/:sessionId/upload        [Bearer upload JWT, matched to :sessionId]
  → assert session exists & uploadComplete = 0
  → for each `files` File   → R2.put(`${sessionId}/${fileId}`, file.stream())
                              (rejects 413 when size > MAX_FILE_SIZE_MB)
  → Promise.all([ all R2 puts, batched files insert ])
  → { uploadedFiles: [{ fileId, filename, isText }] }

POST /api/chest/:sessionId/complete      [Bearer upload JWT]  body: { fileIds, validityDays }
  → assert every fileId belongs to this session   (subset check, see §9.2)
  → retrievalCode = generateRetrievalCode()   (8-char CSPRNG, rejection-sampled)
  → expiresAt = calculateExpiry(validityDays)
  → update session { retrievalCode, uploadComplete: 1, expiresAt }
  → { retrievalCode, expiryDate }

GET /api/retrieve/:retrievalCode         [rate-limited 30/min]
  → find session where retrievalCode = ? AND uploadComplete = 1 (not deleted)
  → reject if expired
  → list files (ordered by createdAt); reject if none
  → chestToken = createChestJWT(sessionId, expiresAt)
  → { files: [...], chestToken, expiryDate }

GET /api/download/:fileId                [chest JWT via Authorization: Bearer only]
  → verifyChestJWT → payload.sessionId
  → join files ⨝ sessions where files.id = :fileId AND files.sessionId = payload.sessionId
  → reject if session expired
  → stream R2.get(`${payload.sessionId}/${fileId}`) with Content-Disposition
```

### 3.1 State transitions

A session has exactly one meaningful boolean lifecycle flag, `uploadComplete`:

- `0` — created, accepting uploads. Retrieval/email/download cannot see it (they
  all filter `uploadComplete = 1`). Reclaimed after 48h if abandoned (§7).
- `1` — sealed. `retrievalCode` and `expiresAt` are now set; no more uploads
  (upload/multipart-create both require `uploadComplete = 0`).

`isDeleted = 1` (soft delete) is the terminal state, set only by the cron.

---

## 4. The token model

There is no session store and no auth library; all access is bearer JWTs signed
HS256 with `JWT_SECRET` over Web Crypto (`src/lib/jwt.ts`). `base64url` uses
`btoa(String.fromCharCode(...bytes))` — fine for the small payloads here.
`verifyJWT` checks the signature and `exp`; each `verifyX` additionally asserts
`payload.type`, so a token minted for one purpose cannot be replayed as another.

| Type | TTL | Minted by | Verified by | Payload |
| --- | --- | --- | --- | --- |
| `upload` | 24h | `POST /chest` | upload, complete, multipart-create | `sessionId`, `type`, `iat`, `exp` |
| `multipart` | 48h | multipart-create | part, multipart-complete | `sessionId`, `fileId`, `uploadId` (R2), `filename`, `mimeType`, `fileSize`, `type`, `iat`, `exp` |
| `chest` | session `expiresAt` (else `+365d`) | `GET /retrieve` | `GET /download` | `sessionId`, `type`, `iat`, `exp` |

Design notes:

- **The `upload` token is the write capability.** It is matched against the URL
  `:sessionId` on every write; a mismatch is `400`. Its 24h life bounds how long
  an unsealed session can be filled.
- **The `chest` token is the read capability**, and it is bound to the share's
  own expiry — a token cannot outlive the files it unlocks. Permanent shares
  (`expiresAt = NULL`) get a 1-year token, the only place a fixed horizon appears.
- **The `multipart` token carries file metadata, not the DB.** See §5.2 — the
  `files` row for a multipart upload is written only at completion, so all the
  data needed to insert it (`filename`, `mimeType`, `fileSize`, R2 `uploadId`)
  rides inside the JWT. Note the create handler returns this JWT in the response
  field named `uploadId` (the field the frontend then echoes back as the "upload
  id").

---

## 5. Upload paths

### 5.1 Direct multipart-form (`POST /chest/:sessionId/upload`)

For smaller payloads. The handler iterates `formData`:

- Each `files` entry (a `File`) is streamed to R2 as `${sessionId}/${fileId}`
  (`value.stream()`, so the body never buffers in memory) and queued as a `files`
  insert. Files over `MAX_FILE_SIZE_MB` are rejected with `413` before any byte
  hits R2. (The former `textItems` path was removed — text is encrypted
  client-side and arrives as a regular file.)

All R2 puts and the single batched `files` insert run under one
`Promise.all` — the DB write is one statement, not one per file.

### 5.2 R2 native multipart (large files)

Three endpoints wrap R2's own multipart API so multi-gigabyte files upload in
resumable parts without ever passing through the Worker's memory as a whole:

1. **`POST .../multipart/create`** — asserts `uploadComplete = 0`, rejects a
   declared `fileSize` over `MAX_FILE_SIZE_MB` (`413`), calls
   `R2_STORAGE.createMultipartUpload(${sessionId}/${fileId})`, inserts a
   `multipart_uploads` tracking row, then mints a `multipart` JWT embedding the
   returned R2 `uploadId` plus the client-declared
   `filename`/`mimeType`/`fileSize`. **No `files` row is written yet.**
2. **`PUT .../multipart/:fileId/part/:partNumber`** — verifies the `multipart`
   token matches both `:sessionId` and `:fileId` (`403` otherwise), rejects an
   empty body, `resumeMultipartUpload(...).uploadPart(partNumber, body)`, and
   returns the part's `etag`. The client accumulates `{ partNumber, etag }`.
3. **`POST .../multipart/:fileId/complete`** — sorts the parts by number,
   `resumeMultipartUpload(...).complete(sortedParts)`, and only then inserts the
   `files` row from the JWT-carried metadata and retires the
   `multipart_uploads` tracking row.

**Consequence (by design):** an abandoned multipart upload leaves an in-progress
R2 upload with no `files` row — invisible to retrieval. Its `multipart_uploads`
row lets the 48h stale-incomplete sweep (§7) **abort the R2 upload explicitly**
(reclaiming the parts), matching the JWT's 48h TTL.

---

## 6. Data model & storage

Drizzle over SQLite (`src/database/schema.ts`). Both tables share a
`trackingFields` mixin: `createdAt`, `updatedAt` (`$onUpdateFn` bumps it on every
write), `isDeleted` (default `0`). **Nothing is hard-deleted from the database**;
all reads filter through `withNotDeleted` (from `@cdlab/db/node`). Only R2 blobs
are ever truly deleted.

### 6.1 `sessions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | UUID v4. |
| `retrievalCode` | text | 8-char code (legacy 6-char rows still resolve); **unique index** `idx_sessions_retrieval_code`. Null until `complete`. |
| `uploadComplete` | int | `0` = filling, `1` = sealed. Default `0`. |
| `expiresAt` | timestamp | Nullable = permanent. Index `idx_sessions_expires_at`; composite `idx_sessions_upload_complete_created_at` serves the stale-incomplete sweep. |

### 6.2 `files`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | UUID v4 — also the R2 object suffix. |
| `sessionId` | text FK | → `sessions.id`, **`onDelete: cascade`**. Index `idx_files_session_id`. |
| `originalFilename` | text | As uploaded. |
| `mimeType` | text | |
| `fileSize` | int | Bytes. |
| `fileExtension` | text | Nullable (`getFileExtension`). |
| `isText` | int | `1` for `textItems`, else `0`. |

### 6.3 `multipart_uploads`

Tracks in-flight R2 multipart uploads (migration `0001`): `fileId` (PK),
`sessionId` (FK, cascade), `r2UploadId`, plus the shared `trackingFields` —
completion and the cron's abort both retire a row by soft-deleting it. Index
`idx_multipart_uploads_session_id`.

### 6.4 R2 key convention

Every blob is `${sessionId}/${fileId}`, everywhere — upload, multipart, download,
and cleanup's `list({ prefix: "${sessionId}/" })` all rely on this. The session
prefix is what lets cleanup delete an entire share with one list + delete pass.
The `onDelete: cascade` FK matters only for a hypothetical hard delete; since the
app soft-deletes, cascade is a safety net, not the operative path.

---

## 7. Cleanup & expiry

`triggers.crons: ["0 * * * *"]` (hourly) → `scheduled()` →
`cleanupExpiredContent(env)` (`src/cron/cleanup.ts`). The cron path has no Hono
context, so it fabricates one: `useDrizzle({ env } as any)` — `useDrizzle` only
reads `c.env`, so this shortcut is safe.

Two cohorts are gathered, then merged and processed uniformly:

1. **Expired** — `expiresAt < now`. `NULL` (permanent) sessions are excluded by
   the `lt` comparison.
2. **Stale-incomplete** — `uploadComplete = 0 AND createdAt < now - 48h`. The
   48h window matches the `multipart` JWT TTL, so any abandoned multipart upload
   is reclaimed exactly when its token dies.

For each session: abort any pending R2 multipart uploads recorded in
`multipart_uploads` (then mark those rows), `R2.list({ prefix })` → `R2.delete`
every object (`Promise.all`), then soft-delete the `files` rows, then the
`session`. The
handler is **failure-tolerant**: every per-session error is pushed onto an
`errors[]` accumulator and the loop continues; the function returns a
`CleanupResult` tally rather than throwing, and `scheduled()` logs it.

**Read-time expiry** is a second line of defense: `retrieve`, `download`, and
`email` all re-check `expiresAt < now` on the hot path, so an expired share is
unreachable in the up-to-59-minute window before the cron runs.

---

## 8. Auxiliary services (share password, email, config)

### 8.1 Share-password gate

Optional, off by default. When the `SHARE_PASSWORD` secret is set,
`POST /chest` requires a matching `password` in the request body, compared with
a constant-time equality check (no early exit, no timing side channel). There
is no dedicated verify endpoint — the frontend validates a password by
attempting `createChest` and reacting to the `401`. It gates only *creation*,
not retrieval/download. `scripts/generate-secrets.sh` produces a fresh
`JWT_SECRET` + `SHARE_PASSWORD` pair. Combined with the per-IP rate limit
(20/min) this bounds abuse of the paid R2/D1 surface.

### 8.2 Email share (`src/routes/email.ts`)

Optional, gated by `ENABLE_EMAIL_SHARE === 'true' && RESEND_API_KEY`.
`POST /api/email/share` looks up the (complete, non-expired) session by retrieval
code, then sends a self-contained HTML email via **Resend** containing the
retrieval code, a link to `${RESEND_WEB_URL}/retrieve?code=...` (falling back to
`http://localhost:3001`), a file summary (first 5 files + "N more"), and an
expiry note. All user-supplied strings are `escapeHtml`-escaped before
interpolation. It never includes any download token — only the code, which still
requires the recipient to hit `/retrieve`.

### 8.3 Public config (`src/routes/config.ts`)

`GET /api/config` is the frontend's knob-discovery endpoint, returning
`{ requirePassword, emailShareEnabled, maxFileSize }`. `maxFileSize` is
`MAX_FILE_SIZE_MB × 1024²` (default 100 MB) and is **advisory** — it tells the UI
what to enforce; the server's hard ceiling is the 5 GB-per-file zod cap in
`validationSchemas.ts`. `emailShareEnabled` is true only when both the flag and
the key are present.

---

## 9. Security model

The whole surface is unauthenticated in the account sense; security rests on
capability tokens and input validation.

### 9.1 Validation

All params/body/query pass zod (`src/lib/validationSchemas.ts` +
`@hono/zod-validator`): UUIDs for `sessionId`/`fileId`, 6–8-char `[A-Z0-9]`
retrieval codes, an optional 1–256-char share `password`, `validityDays` 1–365
(required), part numbers 1–10000, ≤100 `fileIds` per complete, ≤10000 parts, a
MIME-type regex, and the 5 GB per-file cap (plus the runtime
`MAX_FILE_SIZE_MB` 413 check).

### 9.2 Ownership check is a subset assertion

`POST /chest/:sessionId/complete` selects the session's non-deleted files and
rejects (`400`) if any submitted `fileId` is not among them — every `fileId`
must belong to the session being sealed. (This tightened the earlier
count-only check.) The `upload` token already scopes writes to one session, so
this is defense in depth, not the sole boundary.

### 9.3 Download token is header-only

`GET /download/:fileId` accepts the `chest` token via `Authorization: Bearer`
**only** — the former `?token=` query form was removed so tokens never land in
URLs, browser history, or access logs. The frontend downloads via `fetch` +
Blob, so no plain `<a href>` path is needed.

### 9.3b Rate limiting

`src/lib/rate-limit.ts` is a per-IP fixed-window limiter (in-memory per
isolate): `POST /chest` 20/min, `GET /retrieve/:code` 30/min → `429`. Retrieval
throttling also slows retrieval-code guessing (8-char × 36-alphabet makes
brute force impractical to begin with).

### 9.4 Open CORS

`cors()` is applied with no options — every origin is allowed. This is
intentional: the API is a public capability service, and access control is the
token, not the origin. Do not add an allowlist expecting it to be a security
boundary.

### 9.5 Log injection

Access logs record request metadata via the Hono logger; business handlers log
structured fields. Filenames and text content are stored as data, not
interpolated into log format strings, and the email path escapes all
user-supplied HTML (§8.2).

---

## 10. Configuration & deployment

### 10.1 Config

All runtime knobs are `vars` in `wrangler.jsonc` and typed in `CloudflareEnv`
(`src/types/index.ts`). There is no central validated-config object here (unlike
some sibling apps); handlers read `c.env.*` directly and coerce inline
(`=== 'true'` for booleans, `Number.parseInt` for `MAX_FILE_SIZE_MB`). The full
table is in the [README](README.md#configuration). Secrets (`JWT_SECRET`,
`SHARE_PASSWORD`, `RESEND_API_KEY`, `LIBSQL_AUTH_TOKEN`) belong in `.dev.vars`
(local) or `wrangler secret put` (prod), never in committed `vars`.

### 10.2 Bindings

`R2_STORAGE` (bucket `dropply`) is always required. The `DB` binding (D1,
database `dropply`) is **commented out by default** in `wrangler.jsonc` because
the default `DB_TYPE=libsql` uses Turso; to run on D1, uncomment the
`d1_databases` block, set `database_id`, and set `DB_TYPE=d1`.

### 10.3 Migrations

Generated from `schema.ts` with drizzle-kit. `drizzle.config.ts` switches dialect
on `DB_TYPE`: `libsql` → `turso` driver against `LIBSQL_URL`; anything else →
`sqlite` dialect with the `d1-http` driver (which reads
`CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_DATABASE_ID` / `CLOUDFLARE_API_TOKEN` for
remote application). Apply with `db:migrate` (LibSQL) or `cf:localdb` /
`cf:remotedb` (D1). `db:studio` runs Drizzle Studio on port 3015 (bound to
`0.0.0.0` for dev container access).

### 10.4 Deploy

`pnpm --filter @cdlab/dropply-api deploy` runs `wrangler deploy --minify` from
`src/index.ts`. The `bun build ... --target browser` script exists but is a
secondary artifact, not the deploy path — the `browser` target reflects the
Workers/edge (browser-like) execution model. Observability is enabled with 100%
head sampling (`wrangler.jsonc`). There is no test suite; the type-check via
`cf-typegen` + `tsc` and a manual smoke of the create→retrieve→download flow are
the pre-deploy gates.
