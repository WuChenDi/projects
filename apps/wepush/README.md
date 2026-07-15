# wepush

A multi-tenant console for sending **WeChat official-account template messages** —
recipients, templates, scheduled pushes, and a permanent push log, all in one
Next.js app on **Cloudflare Workers**. Every message can weave in live data:
weather, lunar-calendar countdowns, birthdays, a daily quote.

Preview: <https://wepush.cdlab.workers.dev/>

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/wepush/og-image.png)

It replaces the legacy `ALL_CONFIG` + Qinglong-script setup: recipients,
templates, credentials, throttle knobs, cron config, and push logs all live in
the database and are editable from the dashboard. Sign-in is social OAuth, and
**every row is scoped to its owner** — each account only ever sees its own data.

## Why

A "daily good-morning push" bot is easy to hack together and painful to operate:
the recipient list lives in a config blob, the schedule is a cron script on a box
you have to keep alive, and there is no record of what was sent or why a send
failed. `wepush` turns that into an application:

- **Everything in the DB, editable in the UI** — no redeploy to add a recipient,
  change a template, or pause the schedule.
- **Multi-tenant by construction** — one deployment serves many accounts; every
  recipient / template / log / setting is isolated by `ownerId`. One account can
  never read or write another's data.
- **Live data, not static text** — templates interpolate `{{var.DATA}}`
  placeholders resolved per recipient from weather, lunar/solar date math,
  birthdays, and quote sources, with per-variable colors.
- **Three ways to fire** — the UI (single or batch), an authenticated HTTP API
  (per-owner Bearer token), or the Worker's `scheduled()` cron — all through one
  push runner.
- **An audit trail** — every send writes a log with the rendered message, the
  variable snapshot, and the error payload; batches group them, with one-click
  retry.

## Features

| Area | What you get |
| --- | --- |
| **Recipients** | Per-recipient WeChat OpenID, template, city/weather code, festivals & anniversaries (solar + lunar), color toggle, enable/disable. |
| **Templates** | `{{var.DATA}}` editor with a live structure preview and a real-data preview against any recipient. Codes are unique per owner. |
| **Triggers** | UI manual (single / batch), authenticated HTTP API, Worker `scheduled()` cron — one runner, three entry points. |
| **Push log** | Permanent, batch-grouped, status-filtered; stores rendered message + variable snapshot + error payload; one-click retry. |
| **Data sources** | Basic weather (`t.weather.itboy.net`), Hitokoto quotes, iCIBA daily English; probe them at `/debug`. |
| **Calendar** | Solar + lunar date math via `tyme4ts`; each festival has an `isLunar` toggle; birthdays and custom-date countdowns become variables. |
| **Auth** | better-auth social login (Google / GitHub), login == signup, accounts linked by email; server-authorized per-tenant isolation. |

## Quick start

`wepush` is part of the [`@cdlab/projects-monorepo`](../../README.md); run from the
repo root.

```bash
pnpm install
pnpm --filter @cdlab/wepush db:migrate   # libsql/Turso  (or cf:localdb for D1)
pnpm --filter @cdlab/wepush dev          # -> http://wepush.localhost:3355
```

Set the auth secrets first (`.env` / `.dev.vars`): `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, and at least one Google / GitHub client id + secret pair.
Register each OAuth app's callback as
`<BETTER_AUTH_URL>/api/auth/callback/{google,github}`. Then sign in and set your
WeChat `APP_ID` / `APP_SECRET` on `/dashboard/settings`.

> Signing in with the same email across providers links to **one** account (one
> tenant) — `accountLinking` trusts Google and GitHub (both verify the primary
> email).

## How a push runs

```
POST /api/push/run  (or cron scheduled(), or the UI)
  1. requireOwner: session cookie OR Bearer pushApiToken → ownerId
  2. loadConfig(ownerId) + loadTargetUsers(ownerId, userIds?)   scoped to tenant
  3. insert push_batch (status=running)
  4. getAccessToken once per batch                              (WeChat token)
  5. for each recipient:
       aggregateUserData  → weather + calendar + quotes → variables
       renderTemplate     → {{var.DATA}} substitution + colors
       sendTemplateMessage→ WeChat API
       insert push_log    (success | failed + snapshot + error payload)
       throttle: sleep every maxPushOneMinute sends
  6. update batch (success | partial | failed) + counts
```

The cron path (`scheduled()`) fans out **per owner**: it scans every
`user_config` with `cronEnabled` and runs one push for that owner's
`cronUserIds`. Full model in [`DESIGN.md`](DESIGN.md).

## Template variables

Placeholders are Mustache-style `{{name.DATA}}`; empty values render as empty
strings (never leak the raw placeholder). Insert them from the chips under the
template editor.

| Group | Variables | Source |
| --- | --- | --- |
| Built-in | `date` | local |
| Weather | `city`, `weather`, `max_temperature`, `min_temperature`, `wind_direction`, `wind_scale`, `temperature`, `humidity`, `pm25`, `pm10`, `air_quality`, `aqi`, `sunrise`, `sunset`, `notice`, `ganmao` | `t.weather.itboy.net` |
| Festivals | `birthday_message` (next within 30 days), `birthday_0` … `birthday_9`, custom `<keyword>` countdowns from anniversaries | recipient config |
| Quotes | `moment_copyrighting`, `english_note`, `chinese_note` | Hitokoto / iCIBA |

`weatherCityCode` is a 9-digit CMA station code (`t.weather.itboy.net` format);
the picker is backed by `public/data/city-codes.json` (3240 entries). District
codes itboy doesn't index fall back to the city-level code (`xxxxxx01`). Refresh
with `pnpm --filter @cdlab/wepush gen:cities`. Each festival's `isLunar` toggle
converts a lunar `MM-DD` to its next solar occurrence via `tyme4ts`.

## Push API

The push / retry endpoints accept a per-owner `Authorization: Bearer
<pushApiToken>` (auto-generated on first `/settings` load, re-generable there),
so external callers run scoped to that token's owner:

```bash
# All enabled recipients for the token's owner
curl -X POST https://<domain>/api/push/run \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" -d '{"trigger":"api"}'

# Specific recipients
curl -X POST https://<domain>/api/push/run \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" -d '{"trigger":"api","userIds":["id-1","id-2"]}'

# Retry one failed log
curl -X POST https://<domain>/api/push/retry \
  -H "Authorization: Bearer <pushApiToken>" \
  -H "Content-Type: application/json" -d '{"logId":"id"}'
```

## Scheduled push

`wrangler.jsonc` ships `triggers.crons: ["30 23 * * *"]` (07:30 Asia/Shanghai;
edit to taste). The `scheduled()` handler scans every `user_config` with
`cronEnabled` and pushes that owner's `cronUserIds` — pause / resume per account
from Settings without redeploying.

## Security model

Multi-tenant, server-authorized:

- Sign-in is **better-auth** (Google / GitHub, social-only). The dashboard layout
  server-checks the session; **every** `/api/*` route re-verifies it
  (`requireSession`) and scopes queries to the caller's `ownerId`. No client-only
  gate — one account can never touch another's data.
- The **push endpoints** (`/api/push/run`, `/api/push/retry`, batch retry) use
  `requireOwner`: session cookie **or** a per-owner Bearer token, run scoped to
  that owner.
- Each owner has its own WeChat credentials, throttle / cron config, and push
  token in `user_config`. `GET /api/settings` **masks** `wechatAppSecret` and
  `pushApiToken` — secrets are only writable (PATCH) or revealed once on rotate.

> Sign-up is open (anyone who completes OAuth gets an account). To restrict it,
> front the app with Cloudflare Access / an IP allow-list, or add an email
> allow-list in `getAuth()`.

## Configuration

Set via `.env` / `.dev.vars` (local) or `wrangler secret put` (prod); non-secret
`vars` live in `wrangler.jsonc`.

| Var | Meaning |
| --- | --- |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` | Public origin for cookies / OAuth redirects (no trailing slash). |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`. **Secret.** |
| `GOOGLE_CLIENT_ID` / `SECRET`, `GITHUB_CLIENT_ID` / `SECRET` | OAuth credentials (configure at least one). **Secret.** |
| `DB_TYPE` | Driver: `libsql` (default, Turso / local file) or `d1`. |
| `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN` | LibSQL URL (defaults to a local file) + token (**secret**, Turso only). |

Per-owner runtime knobs (`user_config`, edited in Settings, not env):
`maxPushOneMinute` (throttle window), `sleepTime`, `apiTimeout`, `maxRetries`,
`retryDelay`, `defaultWechatTemplateId`.

## Project structure

```
src/
  app/
    dashboard/           session-gated console (recipients, templates, logs, settings)
    api/                 push / templates / users / logs / batches / stats / settings / auth
  services/
    push/                aggregate (per-recipient variables) + runner (fan-out + logs) + scheduled (cron)
    template/render.ts   {{var.DATA}} substitution with per-variable colors
    channels/wechat.ts   access_token + template-message send
    sources/             weather / hitokoto / iciba
    calendar/            solar + lunar date math (tyme4ts)
  database/schema.ts     Drizzle schema (auth tables + user_config + business tables)
  lib/                   auth (getAuth / requireSession / requireOwner), db, http
  worker/index.ts        custom Worker entry (wraps OpenNext + adds scheduled())
DESIGN.md                architecture + push-pipeline / tenancy / cron spec
llms.txt                 agent-oriented usage guide
```

## Build & deploy

```bash
pnpm --filter @cdlab/wepush build       # next build
pnpm --filter @cdlab/wepush db:gen      # generate a migration from schema.ts
pnpm --filter @cdlab/wepush cf:remotedb # apply migrations to remote D1
```

Deploys go through the `deploy-wepush.yml` GitHub workflow (manual dispatch),
which runs `opennextjs-cloudflare build && deploy` and syncs the `WEPUSH_`-prefixed
secrets. `pnpm --filter @cdlab/wepush deploy` works locally but skips the secret
sync.

> **LibSQL on Workers** relies on `serverExternalPackages` in `next.config.ts`
> (`@libsql/client`, `@libsql/hrana-client`, `@libsql/isomorphic-ws`) — they must
> stay external so wrangler resolves them via the `workerd` export condition.
> Migrations must use the **sqlite** dialect (`DB_TYPE=d1`) for D1.

## Design

[`DESIGN.md`](DESIGN.md) is the authoritative spec — the push pipeline, the
per-owner multi-tenancy model, the dual auth gates (`requireSession` /
`requireOwner`), throttling, the data-source aggregation, lunar-date math, and
the cron fan-out. Read it before changing the push runner, tenancy scoping, or
the credential-masking rules.

## License

[MIT](../../LICENSE) © 2025-PRESENT [wudi](https://github.com/WuChenDi)
