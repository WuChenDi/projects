# @cdlab996/flnk

Privacy-first link shortener with geo / device routing and edge analytics.
Built on **Next.js (App Router) + Drizzle**, deployed to **Cloudflare Workers**
via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).

## Features

- **Edge redirect engine** (`app/[slug]/route.ts`) — KV cache → D1 fallback →
  cache fill, configurable status code (default `308`), expiration purge.
- **Geo routing** by `cf.country`, **device routing** for Apple / Android UAs.
- **Query forwarding** (`REDIRECT_WITH_QUERY`, per-link override).
- **Password gate** (HTML form + sha256 verification) and **unsafe interstitial**.
- **Social-bot OG HTML** (`app/[slug]/og/route.ts`) + link cloaking.
- **Access logging** to Analytics Engine via `ctx.waitUntil` (bot detection,
  UA parsing, geo dimensions), with `DISABLE_BOT_ACCESS_LOG` toggle.
- **Multi-domain** support via a `(slug, domain)` composite unique key.
- **Social-login auth** (better-auth — Google + GitHub; login == signup) gating
  the dashboard + every `/api/*` route via a session cookie.
- **i18n** (en / zh) via `next-intl` with a **cookie-based** locale (no URL prefix),
  so it never collides with the top-level `[slug]` route.
- **Cron cleanup** — soft-deletes expired links + purges KV, run from the
  worker's `scheduled()` handler.

## Develop

```bash
pnpm --filter @cdlab996/flnk dev        # http://flnk.localhost:3355 (via nsl)
pnpm --filter @cdlab996/flnk build
pnpm --filter @cdlab996/flnk cf-typegen # regenerate cloudflare-env.d.ts
pnpm --filter @cdlab996/flnk db:gen     # generate a migration from schema.ts
pnpm --filter @cdlab996/flnk db:studio  # drizzle-kit studio (port 3021)
```

Copy `.env.example` to `.env` and set the better-auth + OAuth secrets plus your
DB credentials. `DB_TYPE` selects the driver and **both run in production on
Workers**:

- `DB_TYPE=d1` — uses the `DB` binding (Cloudflare D1).
- `DB_TYPE=libsql` — uses `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN` (remote Turso, or a
  local SQLite file via `file:./src/database/data.db` for offline dev).

> LibSQL on Workers relies on `serverExternalPackages` in `next.config.ts`
> (`@libsql/client`, `@libsql/hrana-client`, `@libsql/isomorphic-ws`). These
> must stay external so wrangler resolves them via the `workerd` export
> condition — removing them breaks the OpenNext build with "Could not resolve
> @libsql/isomorphic-ws". See https://opennext.js.org/cloudflare/howtos/workerd

### Authentication

Auth is **better-auth** with Google + GitHub social login only — the first
sign-in for an account auto-creates the user (login == registration). No
email/password.

Required env (secrets — keep in `.env` locally, `wrangler secret put` for
deploy; only `BETTER_AUTH_URL` is committed in `wrangler.jsonc`):

- `BETTER_AUTH_URL` — the public origin (dev `http://flnk.localhost:3355`).
- `BETTER_AUTH_SECRET` — a long random string.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`

Configure each OAuth app's callback URL as
`{BETTER_AUTH_URL}/api/auth/callback/{google|github}`. A provider with no
credentials set is simply unavailable; at least one must be configured to log
in. **Any** Google/GitHub account that signs in gains dashboard access — front
it with an additional access layer if it must stay private.

## Deploy

```bash
pnpm --filter @cdlab996/flnk deploy
```

Requires Cloudflare bindings: `KV`, `AI`, `ANALYTICS` (Analytics Engine), plus
the database for the active `DB_TYPE` — the `DB` binding (D1) or
`LIBSQL_URL` + `LIBSQL_AUTH_TOKEN` (Turso; set the token via
`wrangler secret put LIBSQL_AUTH_TOKEN`, don't commit it). See `wrangler.jsonc`.

## Seeding a link (manual, P1a)

Insert a row into `links` (`id`, `slug`, `domain`, `url`, optional `config`
JSON). For `CASE_SENSITIVE=false`, store `slug` lowercased. Example `config`:

```json
{
  "geo": { "US": "https://example.com/us" },
  "apple": "https://apps.apple.com/...",
  "google": "https://play.google.com/...",
  "title": "Example",
  "description": "An example link",
  "passwordHash": "<pbkdf2$100000$<saltB64>$<keyB64> — see lib/hash.ts hashLinkPassword>",
  "unsafe": false,
  "redirectWithQuery": true
}
```

Destination URLs must be `http(s)` — other schemes (`javascript:`, `data:`, …)
are rendered as `about:blank` on the OG / interstitial pages. Link passwords are
PBKDF2-SHA256 with a per-link salt (`lib/hash.ts`).
