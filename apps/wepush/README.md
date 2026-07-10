# wepush

[English](./README.md) | [中文](./README.zh-CN.md)

Web console for sending WeChat test-account template messages — recipients, templates, scheduled push, and a permanent push log. Drop-in replacement for the old `ALL_CONFIG` + Qinglong script setup; everything is stored in the database and configurable through the UI.

Preview: https://wepush.cdlab.workers.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/wepush/og-image.png)

## Features

- Recipient management with city, festivals, anniversaries, lunar calendar dates
- Template editor with live structure preview + real-data preview against any recipient
- Push triggers: UI manual (single or batch), authenticated HTTP API, Worker `scheduled()` cron
- Permanent push log with batch grouping, status filters, payload snapshots, one-click retry
- Data source probe (`/debug`) for the basic weather, Hitokoto, iCIBA endpoints
- Account login via **better-auth** (Google / GitHub, login == signup); all data is isolated per account (`ownerId`) — each user only sees their own recipients, templates, logs and settings

## Tech Stack

- **Framework** — Next.js 16 App Router + React 19 + TypeScript
- **Auth** — `better-auth` (Google / GitHub OAuth, social login only)
- **UI** — `@cdlab/ui` (shadcn + Tailwind v4) + TanStack Query / Form + Zustand
- **ORM** — Drizzle, dual driver (`libsql`/Turso or `d1`); both run in production on Workers
- **Calendar** — `react-day-picker` (date picker) + `tyme4ts` (solar/lunar conversion)
- **Deployment** — `@opennextjs/cloudflare` → Cloudflare Workers (with cron triggers)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A SQLite-compatible database (one of):
  - Local `libsql` file (zero-config default, dev)
  - [Turso](https://turso.tech) remote libsql (dev or production)
  - Cloudflare D1 (dev or production)

### Install

```bash
pnpm install
```

### Configure environment

Copy `.env.example` (if present) or create `.env`:

```bash
# better-auth — required. Public origin used for cookies / OAuth redirects
# (no trailing slash). Dev: http://wepush.localhost:3355
BETTER_AUTH_URL=http://wepush.localhost:3355
NEXT_PUBLIC_BETTER_AUTH_URL=http://wepush.localhost:3355
BETTER_AUTH_SECRET=        # openssl rand -base64 32

# OAuth providers — configure at least one
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# DB driver: 'libsql' (default) or 'd1'
DB_TYPE=libsql

# When DB_TYPE=libsql
LIBSQL_URL=file:./src/database/data.db   # or Turso URL
LIBSQL_AUTH_TOKEN=                       # required for Turso

# Only used by drizzle-kit when DB_TYPE=d1 (not used at runtime)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_DATABASE_ID=
CLOUDFLARE_API_TOKEN=
```

### Apply migrations

```bash
pnpm db:migrate            # libsql / Turso
# or for D1
pnpm cf:localdb            # local D1
pnpm cf:remotedb           # remote D1
```

### Run dev server

```bash
pnpm dev
```

Open <http://wepush.localhost:3355>, sign in with Google / GitHub, then configure WeChat APP_ID / APP_SECRET on `/settings`.

### Configure OAuth providers

Register an OAuth app with each provider and set the callback URL to
`<BETTER_AUTH_URL>/api/auth/callback/{google,github}`:

- **Google** — Authorized JavaScript origin `<BETTER_AUTH_URL>`, redirect URI
  `<BETTER_AUTH_URL>/api/auth/callback/google`. On the consent screen set the
  privacy URL to `<BETTER_AUTH_URL>/privacy` and terms to `/terms`.
- **GitHub** — Homepage `<BETTER_AUTH_URL>`, callback
  `<BETTER_AUTH_URL>/api/auth/callback/github`.

Signing in with the same email across providers links to one account (one tenant).

### Deploy to Cloudflare Workers

```bash
# 1. Create a D1 database
pnpm exec wrangler d1 create wepush
# Uncomment the d1_databases block in wrangler.jsonc, fill in database_id

# 2. Push secrets (NOT committed). Set BETTER_AUTH_URL in wrangler.jsonc `vars`.
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm exec wrangler secret put GITHUB_CLIENT_ID
pnpm exec wrangler secret put GITHUB_CLIENT_SECRET
pnpm exec wrangler secret put LIBSQL_AUTH_TOKEN   # only if using Turso in prod

# 3. Apply migrations to the remote DB
pnpm cf:remotedb           # for D1
# or pnpm db:migrate        # for Turso (uses .env)

# 4. Build + deploy
pnpm deploy
```

> **LibSQL on Workers** relies on `serverExternalPackages` in `next.config.ts`
> (`@libsql/client`, `@libsql/hrana-client`, `@libsql/isomorphic-ws`). These must
> stay external so wrangler resolves them via the `workerd` export condition;
> removing them breaks the OpenNext build with "Could not resolve
> @libsql/isomorphic-ws". See <https://opennext.js.org/cloudflare/howtos/workerd>.

## Security model

**Multi-tenant** — every account owns its data, isolated by `ownerId`.

- Sign-in is **better-auth** (Google / GitHub). Login is server-authorized: the dashboard is gated by a server-side session check, and **every** `/api/*` route re-verifies the session (`requireSession`) and scopes its queries to the signed-in user's `ownerId`. There is no client-only gate anymore — one account can never read or write another's recipients / templates / logs / settings.
- The **push endpoints** (`/api/push/run`, `/api/push/retry`, batch retry) use `requireOwner`: they accept either the browser session cookie **or** a per-owner `Authorization: Bearer <pushApiToken>`, and run scoped to that owner.
- Each owner has its own WeChat credentials, throttle/cron config and push token in `user_config`. `GET /api/settings` masks `wechatAppSecret` and `pushApiToken` — secrets are only writable (PATCH) or revealed once on rotate.

Signups are open (anyone who can complete Google/GitHub OAuth gets an account). If you need to restrict who can register, put the app behind an access layer (Cloudflare Access / Zero Trust, an IP allow-list, or a private tunnel) or add an email allow-list in `getAuth()`.

## Push API

All `/api/*` routes require a signed-in session (see Security model). For external callers, the push and retry endpoints also accept a per-owner Bearer token (the run is scoped to that token's owner):

```bash
# Trigger a push for all enabled users
curl -X POST https://<your-domain>/api/push/run \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "api"}'

# Trigger for specific users
curl -X POST https://<your-domain>/api/push/run \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "api", "userIds": ["uuid-1", "uuid-2"]}'

# Retry a single failed log
curl -X POST https://<your-domain>/api/push/retry \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" \
  -d '{"logId": "uuid"}'
```

The `pushApiToken` is auto-generated on first `/settings` load and visible / re-generable from the Settings page.

## Scheduled (cron) push

`wrangler.jsonc` ships with `triggers.crons: ["30 23 * * *"]` (07:30 Asia/Shanghai by default — edit to taste). The Worker's `scheduled()` handler fans out **per owner**: it scans every `user_config` row with `cronEnabled` and pushes that owner's `cronUserIds`. Pause/resume per account from the Settings UI without redeploying.

## Template Variables

Variables use Mustache-style `{{name.DATA}}` placeholders. Click the chips below the template editor to insert them. Empty values render as empty strings (never leak the raw placeholder).

| Group        | Variables                                                                                          | Source       |
| ------------ | -------------------------------------------------------------------------------------------------- | ------------ |
| Built-in     | `date`                                                                                             | local        |
| Basic weather | `city`, `weather`, `max_temperature`, `min_temperature`, `wind_direction`, `wind_scale`, `temperature`, `humidity`, `pm25`, `pm10`, `air_quality`, `aqi`, `sunrise`, `sunset`, `notice`, `ganmao` | t.weather.itboy.net |
| Festivals    | `birthday_message` (next within 30 days), `birthday_0` … `birthday_9` (all sorted), custom `<keyword>` from anniversaries | user config |
| Quotes       | `moment_copyrighting`, `english_note`, `chinese_note`                                              | Hitokoto / iCIBA |

### Weather city code lookup

`weatherCityCode` follows the CMA station-code format used by `t.weather.itboy.net` (9-digit). The picker is backed by `public/data/city-codes.json` (3240 entries from [`sundakai/China-Weather-City-Area-code`](https://github.com/sundakai/China-Weather-City-Area-code)). District-level codes that itboy doesn't index fall back automatically to the city-level code (`xxxxxx01`).

To refresh the list against upstream:

```bash
pnpm gen:cities
```

### Lunar calendar

Each festival has an `isLunar` toggle. Lunar `MM-DD` is converted to the next solar occurrence via `tyme4ts`; display shows a lunar-calendar suffix.

## Project Layout

```
src/
├── app/                # Next.js App Router: landing /, /login, /privacy, /terms,
│                       #   dashboard /dashboard/*, /api/* (incl. /api/auth/[...all])
├── components/         # UserForm, TemplateForm, DatePicker, layout/ (shell, nav), etc.
├── database/           # Drizzle schema (better-auth + business tables) + migrations
├── lib/                # auth (better-auth getAuth/requireSession/requireOwner),
│                       #   auth-client, db, http, push-client, template-variables
├── services/
│   ├── channels/wechat.ts        # WeChat access_token + template message
│   ├── sources/{weather,hitokoto,iciba}.ts
│   ├── calendar/                 # solar + lunar diff math
│   ├── template/render.ts        # {{var.DATA}} substitution with colors
│   └── push/                     # aggregate, runner, scheduled (per-owner)
└── worker/index.ts     # Custom Worker entry wrapping .open-next/worker.js + scheduled()
```

## Scripts

| Script              | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Next.js dev via nsl (`http://wepush.localhost:3355`) |
| `pnpm build`        | Next.js production build                           |
| `pnpm deploy`       | `opennextjs-cloudflare build && deploy`            |
| `pnpm preview`      | Local preview of the Workers build                 |
| `pnpm db:gen`       | Generate a Drizzle migration from the schema       |
| `pnpm db:migrate`   | Apply pending migrations (libsql/Turso)            |
| `pnpm cf:localdb`   | Apply migrations to local D1                       |
| `pnpm cf:remotedb`  | Apply migrations to remote D1                      |
| `pnpm db:studio`    | Drizzle Studio at `http://localhost:3020`          |
| `pnpm gen:cities`   | Refresh `public/data/city-codes.json` from upstream |
| `pnpm cf-typegen`   | Regenerate `cloudflare-env.d.ts` from wrangler.jsonc |

## License

MIT
