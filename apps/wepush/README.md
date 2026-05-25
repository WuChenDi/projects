# wepush

[English](./README.md) | [中文](./README.zh-CN.md)

Web console for sending WeChat test-account template messages — recipients, templates, scheduled push, and a permanent push log. Drop-in replacement for the old `ALL_CONFIG` + Qinglong script setup; everything is stored in the database and configurable through the UI.

## Features

- Recipient management with city, festivals, anniversaries, lunar calendar dates
- Template editor with live structure preview + real-data preview against any recipient
- Push triggers: UI manual (single or batch), authenticated HTTP API, Worker `scheduled()` cron
- Permanent push log with batch grouping, status filters, payload snapshots, one-click retry
- Data source probe (`/debug`) for the basic weather, Hitokoto, iCIBA endpoints
- Password gate (client-side hash) — no login page, no session table

## Tech Stack

- **Framework** — Next.js 16 App Router + React 19 + TypeScript
- **UI** — `@cdlab996/ui` (shadcn + Tailwind v4) + TanStack Query / Form + Zustand
- **ORM** — Drizzle, dual driver (`libsql` for dev/Turso, `d1` for Cloudflare)
- **Calendar** — `react-day-picker` (date picker) + `tyme4ts` (solar/lunar conversion)
- **Deployment** — `@opennextjs/cloudflare` → Cloudflare Workers (with cron triggers)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A SQLite-compatible database (one of):
  - Local `libsql` file (zero-config default)
  - [Turso](https://turso.tech) remote libsql
  - Cloudflare D1 (production)

### Install

```bash
pnpm install
```

### Configure environment

Copy `.env.example` (if present) or create `.env`:

```bash
# Password gate — required (anything non-empty enables the gate)
ACCESS_PASSWORD=change-me

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

Open <http://wepush.localhost:3355> (routed via `@nsio/nsl`). Unlock with `ACCESS_PASSWORD`, then configure WeChat APP_ID / APP_SECRET on `/settings`.

### Deploy to Cloudflare Workers

```bash
# 1. Create a D1 database
pnpm exec wrangler d1 create wepush
# Uncomment the d1_databases block in wrangler.jsonc, fill in database_id

# 2. Push secrets (NOT committed)
pnpm exec wrangler secret put ACCESS_PASSWORD
pnpm exec wrangler secret put LIBSQL_AUTH_TOKEN   # only if using Turso in prod

# 3. Apply migrations to the remote DB
pnpm cf:remotedb           # for D1
# or pnpm db:migrate        # for Turso (uses .env)

# 4. Build + deploy
pnpm deploy
```

## Push API

Recipient CRUD and template CRUD are unauthenticated (behind the password gate). The push and retry endpoints require a Bearer token:

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

`wrangler.jsonc` ships with `triggers.crons: ["30 23 * * *"]` (07:30 Asia/Shanghai by default — edit to taste). The Worker's `scheduled()` handler reads `globalConfig.cronEnabled` + `globalConfig.cronUserIds` at runtime, so you can pause cron from the Settings UI without redeploying.

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

Each festival has an `isLunar` toggle. Lunar `MM-DD` is converted to the next solar occurrence via `tyme4ts`; display shows the `(农历)` suffix.

## Project Layout

```
src/
├── app/                # Next.js App Router (pages + /api routes)
├── components/         # PasswordGate, AppNav, UserForm, TemplateForm, DatePicker, etc.
├── database/           # Drizzle schema + generated migrations
├── lib/                # db, auth, http, logger, push-client, template-variables
├── services/
│   ├── channels/wechat.ts        # WeChat access_token + template message
│   ├── sources/{weather,hitokoto,iciba}.ts
│   ├── calendar/                 # solar + lunar diff math
│   ├── template/render.ts        # {{var.DATA}} substitution with colors
│   └── push/                     # aggregate, runner, scheduled
├── stores/             # zustand (unlock token)
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
