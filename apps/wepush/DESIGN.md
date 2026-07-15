# wepush — Design

> A multi-tenant WeChat official-account push console on Cloudflare Workers.
> One deployment serves many accounts; every recipient, template, credential,
> and log is isolated by `ownerId`. A push resolves live per-recipient variables
> (weather / calendar / quotes), renders a `{{var.DATA}}` template, sends via the
> WeChat template-message API, and records an auditable log — driven identically
> by the UI, an authenticated HTTP API, or a per-owner cron.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — source doc-comments and reviews reference them as
`design §N`.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [Multi-tenancy](#3-multi-tenancy)
4. [Auth & the two gates](#4-auth--the-two-gates)
5. [The push pipeline](#5-the-push-pipeline)
6. [Template rendering](#6-template-rendering)
7. [Data sources & the calendar](#7-data-sources--the-calendar)
8. [Data model](#8-data-model)
9. [Configuration & deployment](#9-configuration--deployment)

---

## 1. Background & goals

`wepush` grew out of a common hack: a "daily good-morning" bot built from an
`ALL_CONFIG` blob and a Qinglong cron script on a spare box. That shape rots — the
recipient list is in code, the schedule is a script you SSH in to edit, and a
failed send leaves no trace. `wepush` promotes it to an application with these
goals:

- **G1 — Everything editable in the UI.** Recipients, templates, credentials,
  throttle, and schedule live in the DB, not in config or code. No redeploy to
  change who gets what, when.
- **G2 — Hard multi-tenancy.** One deployment, many accounts; every business row
  is scoped to its owner and server-authorized, so no account can read or write
  another's data. This is enforced, not aspirational (contrast flnk, whose
  scoping is a designed-in no-op).
- **G3 — One runner, three triggers.** The UI, the HTTP API, and cron all drive
  the *same* push runner, so behavior (rendering, throttling, logging) can't
  diverge between them.
- **G4 — Auditable.** Every send is a log row with the rendered message, the
  variable snapshot, and the structured error payload; batches group them and
  support retry.
- **G5 — Live data.** Templates interpolate per-recipient variables resolved from
  external sources and solar/lunar date math, degrading gracefully when a source
  is down.

### Non-goals

- Not a general notification platform — the only channel is WeChat template
  messages (the abstraction leaves room, but nothing else is wired).
- No email-verification / password auth — social OAuth only.
- No built-in signup restriction — access control is deployment-level (§4).

---

## 2. Architecture

```
                       Cloudflare edge
  operator ─ /dashboard ─┐
  curl / cron caller ────┤   ┌──────────────────────────────────────┐
  Worker cron ───────────┘──►│ src/worker/index.ts                   │
                             │  fetch     → OpenNext → Next.js        │
                             │  scheduled → runScheduledPush(env)     │
                             └───────┬───────────────────┬───────────┘
                                     │                   │
                              D1 / libSQL          WeChat API + data sources
                              (all tenant data)    (token, send, weather, quotes)
```

`wepush` is a Next.js App Router app compiled through
[OpenNext](https://opennext.js.org/cloudflare) to a single Worker. It has no KV,
no Durable Objects, no queues — the only stateful dependency is SQLite (D1 or
libSQL/Turso), selected at request time by `DB_TYPE` via `@cdlab/db/web`.

**Worker entry.** OpenNext emits only `fetch`. `src/worker/index.ts` wraps the
generated `.open-next/worker.js` and adds `scheduled()` → `runScheduledPush(env)`.
The cron handler **forwards `env` explicitly**: `getCloudflareContext()` is only
installed inside OpenNext's fetch wrapper (its context symbol is a getter-only
property backed by AsyncLocalStorage — assigning to it throws), so the whole push
stack (`getDb(env)`, `runPush({ env })`) threads `env` through instead of relying
on the ambient context.

**Layers.** `app/api/*` (thin route handlers: auth gate → validate → call a
service) → `services/*` (push runner, template render, WeChat channel, sources,
calendar) → `lib/*` (auth, db, http with retry). Route handlers hold no business
logic beyond gating and shaping the response.

---

## 3. Multi-tenancy

Each signed-in **`user` is a tenant**; `ownerId === user.id`. Isolation is
enforced at three layers:

1. **Ownership columns.** Every business table (`user_config`, `templates`,
   `users` recipients, `push_batches`, `push_logs`) carries `ownerId` with a
   cascade FK to `user.id`. Two tables — `festivals` and `custom_dates` — hang off
   a recipient (`users.id`) instead and inherit tenant isolation **transitively**:
   they're only ever reached through an owner-validated recipient, so they don't
   need their own `ownerId`.
2. **Scoped queries.** Every read and write filters by `ownerId`. There is no
   global query in the codebase that crosses tenants except the cron scan (§5.3),
   which iterates owners deliberately.
3. **Server-side gates.** The dashboard layout server-checks the session and
   every `/api/*` handler re-verifies it (§4) — the client never decides access.

**Per-owner config, not global.** The former single-row `global_config` (id=1) is
now `user_config` keyed by `ownerId` (PK). Each owner carries their own WeChat
credentials, throttle knobs, cron settings, and a **push API token** — so tenants
never share a WeChat app or a schedule.

**Uniqueness is per-owner.** `templates.code` is unique on `(ownerId, code)`, not
globally — two tenants can both have a template `morning`. `user_config.pushApiToken`
*is* globally unique, because it doubles as a Bearer credential (§4): a collision
would resolve a request to the wrong owner.

---

## 4. Auth & the two gates

**better-auth** with a Drizzle (sqlite) adapter, built **per request**
(`getAuth`) — on Workers the D1 binding and `process.env` only exist inside a
request, so the instance can't live at module top.

- **Social login only** — Google + GitHub OAuth; each enabled only when its
  client id + secret are set. First social sign-in *is* registration.
- **Account linking.** `accountLinking.trustedProviders: ['google','github']` —
  the same email across providers resolves to **one** `user.id` (one tenant, one
  data set), instead of silently creating a second tenant. Safe because both
  providers verify the primary email.
- IP is pinned to `cf-connecting-ip` (better-auth defaults to `X-Forwarded-For`,
  absent on Workers, which would collapse rate limiting into a single shared
  bucket).

Two gates guard the API surface:

| Gate | Used by | Accepts | Returns |
| --- | --- | --- | --- |
| `requireSession(request)` | all console `/api/*` (templates, users, logs, batches, stats, settings) | a better-auth **session cookie** only | `{ user }` (401 otherwise) |
| `requireOwner(request)` | the push API (`/api/push/run`, `/api/push/retry`, batch retry) | session cookie **OR** `Authorization: Bearer <pushApiToken>` | `{ ownerId }` (401 otherwise) |

`requireOwner` is what lets an external caller (curl, a scheduler) drive a push:
the Bearer token is looked up in `user_config.pushApiToken` (unique, soft-delete
aware) and resolved back to its owner, so the run is scoped exactly as a
cookie-authenticated one would be.

**Secret masking.** `GET /api/settings` masks `wechatAppSecret` and
`pushApiToken` — they are only *writable* (PATCH) or *revealed once* on rotate,
never returned in a read.

**Signup is open by design.** Anyone who completes OAuth gets a tenant. Restricting
who can register is a deployment concern (Cloudflare Access, IP allow-list, or an
email allow-list added in `getAuth()` — the same pattern flnk ships).

---

## 5. The push pipeline

The runner (`src/services/push/runner.ts`) is the single path all three triggers
funnel into. `runPush({ ownerId, trigger, userIds?, env? })`:

### 5.1 Batch lifecycle

```
loadConfig(ownerId)                    → user_config (throttle, creds, default template)
loadTargetUsers(ownerId, userIds?)     → enabled, non-deleted recipients (all, or the given ids)
insert push_batch (status=running, totalCount)
getAccessToken(creds)                  → ONCE per batch, reused for every send
for each recipient (sequential):
    processUser → aggregate → render → send → insert push_log
    throttle (§5.2)
update push_batch (success | partial | failed, counts, finishedAt)
```

The WeChat `access_token` is fetched **once per batch** and reused for every
recipient — not per-send, and not cached across batches. If the token fetch
fails, the batch still runs: every recipient logs a `failed` row with the token
error, so the failure is recorded per-recipient rather than aborting the batch.

### 5.2 Per-recipient processing & throttling

`processUser` is fully isolated — a thrown error becomes a `failed` `push_log`
(with a structured `errorPayload`: `WeChatError` code + payload, or an error
stack) and the loop continues. Success writes a `success` log with the rendered
title/desc and the variable snapshot; a data-source warning (a source that failed
but didn't block the send) is recorded on the otherwise-successful row.

Throttling respects WeChat's rate limit: after every `maxPushOneMinute` sends the
runner sleeps `sleepTime` ms (default 65s — just over a minute); between sends
within the window it sleeps `min(2000, sleepTime)` ms. All knobs come from the
owner's `user_config`.

### 5.3 Triggers

- **Manual / API** — `POST /api/push/run` (`requireOwner`), optional `userIds` to
  target a subset. `trigger` is `manual` or `api`.
- **Cron** — `runScheduledPush(env)` scans every `user_config` with `cronEnabled`
  and calls `runPush` per owner for that owner's `cronUserIds` (`trigger: 'cron'`).
  Owners are processed **sequentially** (each `runPush` already self-throttles and
  tenant count is small); a per-owner failure is logged, never thrown, so one
  tenant's failure can't abort the sweep. Cron config lives in `wrangler.jsonc`
  (`triggers.crons`, default `30 23 * * *` = 07:30 Asia/Shanghai).
- **Retry** — `/api/push/retry` (single log) and batch retry re-run failed
  recipients through the same runner.

---

## 6. Template rendering

`renderTemplate(template, data, { showColor })` (`src/services/template/render.ts`)
substitutes `{{name.DATA}}` placeholders in the template's `title` and `desc`:

- Each variable is `{ value, color? }`. The placeholder regex is built from an
  escaped key, so a variable name can't inject regex metacharacters.
- **Colors.** WeChat template data is `{ value, color }` per field. Color
  resolution: the variable's own `color` → a per-key default (a curated palette,
  with any `birthday_N` falling back to the `birthday_message` color) → `#000000`.
  When the recipient's `showColor` is off, every field is forced to `#000000`.
- **Empty values render empty.** A missing/empty variable substitutes to `''` —
  the raw `{{…}}` placeholder is never leaked into a sent message.

The renderer returns `{ title, desc, wechatData }`; `wechatData` is the exact
`{ value, color }` map the WeChat send API expects. `extractVariableNames` powers
the editor's live structure preview.

---

## 7. Data sources & the calendar

`aggregateUserData(recipient, ctx)` (`src/services/push/aggregate.ts`) builds a
recipient's variable map, and — critically — **never throws**: each source failure
is collected into an `errors` map (logged as a warning on the successful send)
rather than aborting the push.

| Source | Variables | Behavior on failure |
| --- | --- | --- |
| local | `date` | always present |
| weather (`t.weather.itboy.net`, by `weatherCityCode`) | `city`, `weather`, temperatures, wind, humidity, `pm25/pm10`, `air_quality/aqi`, `sunrise/sunset`, `notice`, `ganmao` | falls back to the recipient's plain `city`; logs `errors.weather` |
| iCIBA | `english_note`, `chinese_note` | logs `errors.iciba` |
| Hitokoto | `moment_copyrighting` | logs `errors.hitokoto` |
| calendar | `birthday_message`, `birthday_0…9`, custom `<keyword>` countdowns | computed locally |

External fetches go through `lib/http` (`fetchJson`) wrapped in `withRetry`
(`apiTimeout` / `maxRetries` / `retryDelay` from the owner's config). iCIBA +
Hitokoto are fetched concurrently. `aggregateUserData` is **pure** (no DB) and is
shared by the runner, `/api/push/preview`, and `/api/push/dry-run` — so the
dashboard preview resolves variables through the exact same code a real send
does, guaranteeing preview/dry-run parity.

**Calendar.** `services/calendar/` does solar + lunar date math on `tyme4ts`.
All "today" math is pinned to **`Asia/Shanghai`** (`@date-fns/tz` `TZDate`), not
the Worker's UTC clock — critical because the default cron fires at 23:30 UTC,
which is 07:30 the *next* day in CST; using UTC would compute countdowns against
the wrong date. Each festival carries an `isLunar` toggle; a lunar `MM-DD` is
converted to its **next solar occurrence** (probing year ±1 to handle the
lunar-new-year wrap, skipping invalid dates like day 30 of a 29-day month) and
rendered with a lunar-calendar suffix. `birthday_message` is the next birthday
within 30 days; `birthday_0…9` are ten indexed slots (unused slots render empty,
so a template with `{{birthday_5.DATA}}` degrades gracefully); custom
anniversaries become `<keyword>` day-count variables (`differenceInCalendarDays`,
so a past date reads as a positive "days since").

---

## 8. Data model

Drizzle over SQLite (`src/database/schema.ts`); every business table shares a
`trackingFields` block (`createdAt`, `updatedAt`, `isDeleted` soft-delete — never
hard-delete).

| Table | Purpose | Ownership |
| --- | --- | --- |
| `user` / `session` / `account` / `verification` | better-auth core (a `user` is a tenant). | — |
| `user_config` | Per-owner WeChat creds, throttle, cron config, push token. **PK = ownerId.** | 1:1 owner |
| `templates` | Message templates (`code`, `title`, `desc`). | `ownerId`; `(ownerId, code)` unique |
| `users` | Push **recipients** (OpenID, template, city, color, enabled). | `ownerId` |
| `festivals` | Per-recipient birthdays/festivals (`MM-DD`, `isLunar`). | via `users.id` (transitive) |
| `custom_dates` | Per-recipient anniversaries (`keyword`, `YYYY-MM-DD`). | via `users.id` (transitive) |
| `push_batches` | One row per run (`trigger`, `status`, counts, timing). | `ownerId` |
| `push_logs` | One row per recipient per run (rendered message + variable snapshot + error payload). | `ownerId` + `batchId` |

> **Type note.** `User` / `NewUser` are the **recipient** rows (table `users`).
> The better-auth account is `AuthUser` (table `user`). The naming mirrors the
> console UI, which calls recipients "users" throughout — don't confuse them.

`push_logs` is the audit trail: `variableSnapshot` (the exact resolved variables),
`renderedTitle` / `renderedDesc` (what was sent), and `errorPayload` (structured
WeChat / HTTP error) make every send reproducible and every failure diagnosable.

---

## 9. Configuration & deployment

### 9.1 Config split

- **Deployment env** (`.env` / `.dev.vars` / `wrangler secret put`) — auth +
  driver: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, OAuth client id/secret pairs,
  `DB_TYPE`, `LIBSQL_URL` / `LIBSQL_AUTH_TOKEN`. Secrets are never `vars`.
- **Per-owner runtime** (`user_config`, edited in Settings) — WeChat
  `APP_ID`/`APP_SECRET`, `defaultWechatTemplateId`, `maxPushOneMinute`,
  `sleepTime`, `apiTimeout`, `maxRetries`, `retryDelay`, `cronEnabled`,
  `cronUserIds`, `pushApiToken`.

The split is the point: **operational** config (who to push, how fast, when) is
tenant data editable without a deploy; **deployment** config (auth, DB) is
env/secret.

### 9.2 Dual driver

`DB_TYPE` selects D1 (`DB` binding) or libSQL/Turso (`LIBSQL_URL` + token) at
request time via `@cdlab/db/web`'s `getDb(env?)`. Both run in production on
Workers. `getDb` takes an injected `env` for the cron path (no fetch context).
`@libsql/client` must stay in `serverExternalPackages` (`next.config.ts`) or the
OpenNext build breaks (`Could not resolve @libsql/isomorphic-ws`) — see the
[OpenNext workerd guide](https://opennext.js.org/cloudflare/howtos/workerd).

### 9.3 Migrations

Generated from `schema.ts` with drizzle-kit. For D1, generate with the **sqlite**
dialect (`DB_TYPE=d1`) — the libSQL default emits `ALTER COLUMN`, which D1
rejects. Apply with `db:migrate` (libSQL/Turso), `cf:localdb` / `cf:remotedb`
(D1).

### 9.4 Deploy

Deploys run through the `deploy-wepush.yml` GitHub workflow (manual dispatch):
`opennextjs-cloudflare build && deploy`, syncing `WEPUSH_`-prefixed secrets from
repository secrets. The local `pnpm --filter @cdlab/wepush deploy` works but skips
the secret sync — prefer the workflow. Deployment-affecting changes (new secrets,
migrations, cron) must be reflected in that workflow and in `wrangler.jsonc`.
