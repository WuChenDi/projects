# @cdlab996/sink

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
pnpm --filter @cdlab996/sink dev        # http://sink.localhost:3355 (via nsl)
pnpm --filter @cdlab996/sink build
pnpm --filter @cdlab996/sink cf-typegen # regenerate cloudflare-env.d.ts
pnpm --filter @cdlab996/sink db:gen     # generate a migration from schema.ts
pnpm --filter @cdlab996/sink db:studio  # drizzle-kit studio (port 3021)
```

Copy `.env.example` to `.env` and set the better-auth + OAuth secrets plus your
DB credentials. `DB_TYPE=libsql` uses a local SQLite file by default;
`DB_TYPE=d1` uses the `DB` binding.

### Authentication

Auth is **better-auth** with Google + GitHub social login only — the first
sign-in for an account auto-creates the user (login == registration). No
email/password.

Required env (secrets — keep in `.env` locally, `wrangler secret put` for
deploy; only `BETTER_AUTH_URL` is committed in `wrangler.jsonc`):

- `BETTER_AUTH_URL` — the public origin (dev `http://sink.localhost:3355`).
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
pnpm --filter @cdlab996/sink deploy
```

Requires Cloudflare bindings: `DB` (D1), `KV`, `AI`, `ANALYTICS`
(Analytics Engine). See `wrangler.jsonc`.

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
