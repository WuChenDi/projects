# PLAN-001 Rebuild shortener as a Sink-like Next.js app

- **status**: implementing
- **createdAt**: 2026-06-14 05:23
- **approvedAt**: 2026-06-14 05:48
- **relatedTask**: FEAT-001

## Context

### Current `apps/shortener` (Hono Worker, ~3500 LOC)

- Entry `src/index.ts`: Hono app. Routes — redirect (`/:shortCode`,
  `/:shortCode/og`), landing/health (`/`, `/health`), JWT-protected admin API
  (`/api/url` CRUD, `/api/ai/*`, `/api/analytics/*`).
- Storage: D1/LibSQL via Drizzle (`src/database/schema.ts` — `links`, `pages`).
  `links` keyed by `hash = sha256(domain:shortCode)`, unique on hash and on
  `(shortCode, domain)`. Soft delete via `isDeleted`.
- KV: `url:{hash}`, `og:{hash}`, `ai:slug:{url}` caches with explicit
  invalidation on update/delete; `stats:total-links` counter.
- Workers AI: `src/utils/slug.ts` (slug gen + Base62 fallback).
- Analytics Engine: `src/middleware/analytics.ts` writes a data point on each
  302; `src/utils/analytics.ts` queries via the Cloudflare AE SQL API.
- Cron: `src/cron/cleanup.ts` soft-deletes expired links (cron `0 0 * * *`).
- Frontend: SSR landing page only (`src/pages/HomePage.tsx`, Hono JSX). No
  admin dashboard.
- Auth: ES256 JWT (`src/middleware/jwt.ts`, jose) on `/api/*`.

### Stack reference — `apps/wepush` (Next.js on Cloudflare)

- `next build` + `@opennextjs/cloudflare`; custom `src/worker/index.ts` wraps
  `.open-next/worker.js` to add `scheduled()` for cron.
- `src/lib/db.ts` `getDb(env?)`: dual driver. D1 via `getCloudflareContext()`;
  libsql (dev) via `new Function` dynamic import to dodge bundling.
- API route handlers under `src/app/api/**/route.ts`; zod `safeParse` for
  validation; `NextResponse.json` envelopes.
- UI: `@cdlab996/ui` (shadcn-react), Tailwind v4, `recharts`, `sonner`,
  `next-themes`, TanStack Query, Zustand. Client-side `PasswordGate` + DB
  bearer token for protected mutation endpoints.

### Feature reference — `tmp/Sink` (Nuxt 4, product target)

- Pure-KV storage (`link:{slug}` JSON + metadata). Single `SITE_TOKEN` auth.
- Rich link model: `url, slug, comment, expiration, title, description, image,
  apple, google, cloaking, redirectWithQuery, password, unsafe, geo{CC:url}`.
- Redirect middleware: geo target, apple/google device target, password gate
  (HTML form / `x-link-password` header), unsafe-warning interstitial,
  social-bot OG HTML, cloaking HTML, access log to Analytics Engine.
- Dashboard pages: `links`, `link` (editor), `analysis`, `realtime`, `check`,
  `migrate`, `login`. Server API ~30 endpoints. R2 for image upload + backup.
- Analytics charts via `@unovis/vue`; WebGL globe for realtime.

## Decisions (settled with user)

1. **Storage = hybrid: D1/Drizzle source of truth + KV redirect cache.** Not
   Sink's pure-KV. Rationale: a rich dashboard needs SQL (search / sort /
   paginate / filter / count / cron-expire); KV list is prefix-only,
   eventually consistent, N+1, no unique constraint. KV is kept only as a
   per-slug redirect cache with explicit invalidation (shortener already does
   this). Only cost vs pure-KV: first cache-miss redirect hits D1 — absorbed
   by the cache.
2. **Schema = two-layer.** Indexed real columns for queryable/uniqueness/cron
   fields; one JSON column for rarely-queried rich config.

   ```ts
   links(
     id,                 // @cdlab996/genid
     slug,               // redirect key; unique per domain (see below)
     domain,             // multi-domain retained (consistent with shortener)
     url, comment,       // searchable real columns (Sink searches slug/url/comment)
     config: text(json), // { geo, apple, google, title, description, image,
                         //   cloaking, redirectWithQuery, unsafe, password(hash) }
     expiresAt, createdAt, updatedAt, isDeleted,
   )
   // unique index on (slug, domain). Drops the opaque sha256(domain:slug)
   // hash layer in favor of a readable composite key — same multi-domain
   // capability, easier to extend. KV cache key: link:{domain}:{slug}.
   ```

## Proposal

Deliver in phases; each phase is an independently verifiable slice. Exact
phase boundaries pending user confirmation (see Annotations open items).

- **P1 (MVP)**: scaffold Next.js/OpenNext app (wepush pattern) · Drizzle schema
  + migration · `getDb` dual driver · site-token login + middleware gate ·
  link CRUD/list/search/sort/pagination/QR · redirect route handler
  (geo/device/password/unsafe/OG, KV cache + AE access log) · AI slug · basic
  analysis (counters / views / metrics).
- **P2**: realtime (chart + logs; WebGL globe deferred) · heatmap · link
  health check.
- **P3**: migrate (backup / import / export + R2) · image upload (R2) ·
  cloaking · UTM builder · i18n (next-intl en/zh).

### Mechanical mapping (Sink/Hono -> Next.js)

- Redirect middleware -> `app/[slug]/route.ts` (GET, plus POST for password
  submit) + `app/[slug]/og/route.ts`; analytics via
  `ctx.waitUntil(writeAnalytics(...))` using `getCloudflareContext()`.
- Admin API -> `app/api/link/**`, `app/api/ai/**`, `app/api/stats/**` route
  handlers; zod `safeParse`.
- Site-token auth -> `middleware.ts` over `/api/*` (+ dashboard), Bearer.
- Bindings (D1/KV/AI/ANALYTICS, later R2) -> `getCloudflareContext().env`;
  `wrangler.jsonc` with `assets` + bindings + cron.
- Cron cleanup -> `src/worker/index.ts` `scheduled()` wrapper.
- Logger -> console-based (drop winston; no FS on Workers).
- UI -> `@cdlab996/ui` shadcn-react; charts via `recharts` (wepush already
  uses it) instead of `@unovis`.

## Feature Inventory (from Sink)

Complete enumeration of Sink's capabilities to port, each tagged with its
proposed phase. Checkboxes double as the implementation checklist. `P1` = MVP,
`P2` = next, `P3` = later. Items marked `(drop)` are intentionally not ported.

### A. Auth & Access

- [ ] `P1` Single site-token login page (`/dashboard/login`), token stored
  client-side; `GET /api/verify` validates it.
- [ ] `P1` Auth middleware over `/api/*` and dashboard routes (Bearer token).
- [ ] `P3` `previewMode` flag — read-only public demo mode (disable mutations).

### B. Link Data Model (Drizzle `links`, two-layer)

- [ ] `P1` Core columns: `id`, `slug`, `domain`, `url`, `comment`,
  `createdAt`, `updatedAt`, `expiresAt`, `isDeleted`. Unique index on
  `(slug, domain)` — multi-domain retained (consistent with shortener),
  drops the sha256 hash layer. KV key `link:{domain}:{slug}`.
- [ ] `P1` `config` JSON column holding: `title`, `description`, `image`,
  `apple`, `google`, `geo{CC:url}`, `cloaking`, `redirectWithQuery`,
  `unsafe`, `password` (hashed).
- [ ] `P1` Slug rules: `slugRegex` validation, `reserveSlug` list
  (`dashboard`, `api`, `_docs`, static assets…), configurable default length,
  `caseSensitive` toggle.
- [ ] `P1` Link password hashing/verify util + masked-display on edit.

### C. Redirect Engine (`app/[slug]/route.ts` + `/[slug]/og`)

- [ ] `P1` Slug lookup with KV cache (`link:{slug}`, `linkCacheTtl`) →
  D1 fallback → cache fill.
- [ ] `P1` `301`/`302`/`307`/`308` redirect, status code configurable
  (`redirectStatusCode`).
- [ ] `P1` `homeURL` redirect for `/`; `notFoundRedirect` for misses (else 404).
- [ ] `P1` Expiration check (expired → 404 / notFoundRedirect + cache purge).
- [ ] `P1` `redirectWithQuery` — forward incoming query string (global + per-link).
- [ ] `P1` Geo routing — per-country target URL via `cf.country`.
- [ ] `P1` Device routing — `apple` (iOS UA) / `google` (Android UA) targets.
- [ ] `P1` Password gate — HTML form (GET) + `x-link-password` header path;
  no-store HTML interstitial.
- [ ] `P1` Unsafe-link warning interstitial (confirm before proceeding).
- [ ] `P1` Social-bot detection → OG preview HTML (`title`/`image`).
- [ ] `P2` Cloaking — render target inside an iframe/HTML shell, no-store.
- [ ] `P1` Access log write to Analytics Engine via `ctx.waitUntil`
  (`disableBotAccessLog` toggle, bot detection).

### D. Analytics Ingestion (Analytics Engine)

- [ ] `P1` Dimensions (blobs): `slug, url, ua, ip, referer, country, region,
  city, timezone, language, os, browser, browserType, device, deviceType,
  COLO`; doubles: `latitude, longitude`.
- [ ] `P1` UA parsing (ua-parser-js + extension lists) and bot classification.
- [ ] `P1` AE SQL query helper (Cloudflare AE SQL API; `_sample_interval`
  weighting; time/filter clause builder; SQL sanitization).

### E. Analytics Dashboard (`/dashboard/analysis`)

- [ ] `P1` Counters: visits, visitors, referers (`GET /api/stats/counters`).
- [ ] `P1` Views time-series chart (`GET /api/stats/views`) with date-range +
  filter controls (recharts).
- [ ] `P1` Metric groups (`GET /api/stats/metrics?type=…`), grouped tabs:
  location(country/region/city), referer(referer/slug),
  time(language/timezone), device(device/deviceType),
  browser(os/browser/browserType).
- [ ] `(placeholder)` Locations map / heatmap (`GET /api/stats/heatmap`
  weekday×hour; `GET /api/location`). Not built now — leave UI placeholders;
  React map lib deferred.
- [ ] `P1` Date-range picker + dimension filter bar (drill-down by clicking a
  metric value sets a filter).

### F. Realtime (`/dashboard/realtime`)

- [ ] `(placeholder)` Live event log feed (`GET /api/logs/events`).
- [ ] `(placeholder)` Realtime visits chart + time-window picker.
- [ ] `(placeholder)` WebGL globe (`GET /api/logs/locations`). Not built —
  leave an empty placeholder page/section; revisit later.

### G. Link Management (`/dashboard/links`, `/dashboard/link`)

- [ ] `P1` Paginated link list (`GET /api/link/list`, cursor/limit) with
  metadata.
- [ ] `P1` Search (`GET /api/link/search` by slug/url/comment — server-side
  SQL `LIKE`, replacing Sink's client fuse.js).
- [ ] `P1` Sort (createdAt / updatedAt / expiration).
- [ ] `P1` Create (`POST /api/link/create`) + Edit (`PUT /api/link/edit`) +
  Upsert (`POST /api/link/upsert`) + Delete (`POST /api/link/delete`),
  with KV cache invalidation.
- [ ] `P1` Single-link query (`GET /api/link/query?slug=`).
- [ ] `P1` Link editor form: url, slug (+ random gen), comment.
- [ ] `P1` Editor advanced (accordion): link settings (redirectWithQuery,
  cloaking, unsafe, expiration date, password), OG (title, description,
  image), device (google/apple), geo routes (country select + url).
- [ ] `P1` QR code generation/download per link.
- [ ] `P1` Copy short link, open, per-row actions.
- [ ] `P3` UTM builder helper in the editor.
- [ ] `P3` Country select component (ISO list + flags) for geo routes.

### H. AI

- [ ] `P1` AI slug generation (`GET /api/link/ai`) — Workers AI, configurable
  `aiModel`/`aiPrompt`, JSON-slug parse, Base62 fallback, KV cache.
- [ ] `P3` AI OG metadata generation (`GET /api/link/og-ai`) — title +
  description from page content.

### I. Link Health Check (`/dashboard/check`)

- [ ] `P2` Bulk link health/safe-browsing check (`POST /api/link/check`):
  config form, status tabs, results table. Optional Safe Browsing DoH
  (`safeBrowsingDoh`).

### J. Migrate (`/dashboard/migrate`)

- [ ] `P3` Export links as JSON (`GET /api/link/export`).
- [ ] `P3` Import links from JSON (`POST /api/link/import`) with
  success/skipped/failed report.
- [ ] `P3` Auto + manual backup to R2 (`POST /api/backup`, cron, scheduled
  plugin; `disableAutoBackup` toggle).
- [ ] `P3` Access-log CSV export (`GET /api/stats/export`).
- [ ] `P3` Cloudflare Access import helper (`AccessExport`).

### K. Image / R2

- [ ] `P3` Image upload for OG (`POST /api/upload/image` → R2) +
  `_assets/[...key]` serving route.

### L. Cron

- [ ] `P1` Expired-link cleanup (soft delete + KV purge) via worker
  `scheduled()` (reuse existing `cron/cleanup.ts` logic, adapted to slug key).
- [ ] `P3` Daily R2 backup trigger (with J).

### M. Platform / Config

- [ ] `P1` `getCloudflareContext().env` bindings: `DB`, `KV`, `AI`,
  `ANALYTICS` (+ `R2` in P3).
- [ ] `P1` `wrangler.jsonc` (assets, bindings, cron), `next.config.ts`,
  `open-next.config.ts`, custom `src/worker/index.ts`.
- [ ] `P1` Runtime config / env flags: `siteToken`, `redirectStatusCode`,
  `linkCacheTtl`, `redirectWithQuery`, `homeURL`, `dataset`, `aiModel`,
  `aiPrompt`, `caseSensitive`, `listQueryLimit`, `disableBotAccessLog`,
  `notFoundRedirect`, `slugDefaultLength`. (`aiOgPrompt`, `disableAutoBackup`,
  `safeBrowsingDoh`, R2 names → P3.)
- [ ] `P1` i18n (next-intl en/zh) — baked in from the start; all dashboard
  strings keyed in `messages/{en,zh}.json`.
- [ ] `P1` Dark/light theme (next-themes), sidebar shell, toasts (sonner).
- [ ] `(drop)` OpenAPI docs (scalar/swagger) — Nitro-specific, not ported
  unless requested.
- [ ] `P3` Landing/home page (marketing) — keep a minimal one in P1, polish later.

## Risks

- **Scope**: full Sink parity is multi-week, multi-thousand LOC. Phasing is
  mandatory; do not attempt one-shot.
- **Redirect routing collision**: `app/[slug]` is a catch-all at root and can
  shadow dashboard/API/asset routes — needs a reserved-slug list and correct
  segment precedence (Sink keeps a `reserveSlug`).
- **OpenNext bindings on dev**: libsql dynamic-import shim + `getCloudflareContext`
  caveats (already solved in wepush; reuse verbatim).
- **Chart parity**: `@unovis` visuals (heatmap, globe) have no drop-in React
  equivalent; recharts covers bar/line, globe is deferred.
- **Data migration**: existing `links.hash` rows vs new `slug`-keyed schema —
  if any production data exists, needs a migration path (TBD; likely greenfield).
- **Migrations are tool-generated only** (Drizzle Kit), never hand-edited.

## Scope

Large. New/changed files across `apps/shortener` (app router pages, API route
handlers, dashboard components, Drizzle schema + generated migration, worker
wrapper, wrangler/next/opennext config, package.json). Shared `@cdlab996/ui`
likely needs a few additional shadcn primitives.

## Alternatives

- **Pure-KV (Sink-faithful)**: simplest storage, fastest global redirect, but
  weak dashboard (no real search/sort/paginate/count), eventual consistency,
  racy uniqueness. Rejected — dashboard is the whole point.
- **All-in-one-JSON column in D1**: store the entire link as one blob. Rejected
  — loses unique slug constraint, SQL list/sort/filter, cron-expire query;
  reinvents KV's weaknesses inside D1.
- **New app `apps/sink` vs replace `apps/shortener`**: open (see Annotations).

## Annotations

### 2026-06-14 — Open decisions blocking approval

1. **Phase boundaries**: confirm P1/P2/P3 split above; in particular whether
   the WebGL realtime globe is dropped, deferred to P3, or required.
2. **Replace vs new app**: overwrite `apps/shortener` in place, or scaffold a
   new `apps/sink` alongside and retire the old one later?
3. **Auth**: adopt Sink's single `SITE_TOKEN` (recommended, simplest for a
   single-admin dashboard), or keep ES256 JWT, or wepush's DB-token model?
4. **i18n**: confirm next-intl en/zh, and that it can land in P3 (Sink ships
   i18n, but it is not core to the dashboard MVP).

> Note: repo root `CLAUDE.md` is a checked-in project file; PMA tracking docs
> were added under `docs/` without introducing an `AGENTS.md` symlink, to avoid
> clobbering it. Revisit if the user wants full PMA project injection.

### 2026-06-14 — Decisions resolved (user)

1. **New app** `apps/sink` (`@cdlab996/sink`), alongside the existing
   `apps/shortener` (not a replace). Worker/binding base name `sink`.
2. **Greenfield** — no production data to migrate; fresh Drizzle schema +
   generated migration; old `hash`/`pages` design not carried over.
3. **Auth** = single `SITE_TOKEN` in an **env var** (not DB); login page stores
   it client-side; `/api/*` + dashboard gated by Bearer. ES256 JWT / wepush
   DB-token dropped.
4. **Multi-domain retained** (consistent with shortener, easier to extend):
   `domain` column + unique `(slug, domain)`; redirect resolves by request
   Host; KV key `link:{domain}:{slug}`; `domain` kept as an analytics
   dimension. The sha256 hash layer is dropped in favor of the readable
   composite key.
5. **P1 split** into P1a / P1b / P1c (each separately approved + verified):
   - P1a: scaffold (Next/OpenNext) + Drizzle schema/migration + `getDb` dual
     driver + site-token login/middleware + redirect engine
     (geo/device/password/unsafe/OG, KV cache, AE access log) + cron cleanup +
     i18n baseline.
   - P1b: link management (list/search/sort/CRUD/upsert/editor basic+advanced/
     QR) + AI slug.
   - P1c: analytics dashboard (counters/views/metrics groups + date/filter).
6. **Redirect default status code** = `308`, configurable via
   `redirectStatusCode`.
7. **Frontend stack** = aligned with wepush: TanStack Query + `@tanstack/
   react-form` + `@cdlab996/ui` (shadcn-react) + recharts + sonner +
   next-themes.
8. **IDs** = `@cdlab996/genid` for link id; random slug, default length 6,
   configurable.
9. **Analytics Engine** = adopt Sink's dimension layout (16 blobs + 2 doubles,
   plus `domain`); dataset name kept as `shortener_analytics` per approval
   (greenfield — trivially renameable to `sink` before first deploy if desired).
10. **WebGL globe** — not built; leave an empty placeholder.
11. **Map / heatmap** — not built now; leave placeholders; React map lib
    deferred.
12. **i18n wanted** — next-intl en/zh **baked into P1** (moved out of P3) so
    strings are keyed from the start.
13. **OpenAPI docs** (scalar/swagger) — not ported.

**One interpretation to confirm (#4):** "保持一致" is taken to mean *retain
multi-domain capability*, implemented as a readable `(slug, domain)` composite
unique key (sha256 hash layer dropped). If you instead meant *keep the exact
sha256(domain:slug) hash mechanism*, say so and the schema will use that.

### 2026-06-14 — Confirmed: option A, greenfield

User chose **A** — composite `(slug, domain)` unique key, sha256 hash dropped.
**No migration script** — treat as a brand-new project; a fresh DB is
initialized from the generated baseline migration. Plan → implementing.
Starting **P1a**.

### 2026-06-14 — BKD task planning

P1 sliced into BKD issues (project `projects` / `68ll1mkh`, tags
`sink`,`FEAT-001`, status `todo`, not yet dispatched):

- `hd2zbarw` — Sink P1a: scaffold + schema + auth + redirect engine
  (worktree; **dispatched** claude-code / claude-opus-4-8[1m], status `working`)
- `u3wuz8f7` — Sink P1b: link management + AI slug (`todo`)
- `l0huhojt` — Sink P1c: analytics dashboard (`todo`)

Each carries a full scope/acceptance follow-up. Dependency chain P1a → P1b →
P1c.

### 2026-06-14 — P1a complete, reviewed, merged

P1a delivered and merged into `feat/sink-app` (subtask `hd2zbarw` → done).
Coordinator independently verified build + biome, ran /pma-cr, and fixed 3
findings (commit `7a846d9`): apple-UA over-match (desktop macOS), relative
`notFoundRedirect` throwing in `Response.redirect`, non-constant-time
site-token compare. Subtask had already fixed a password-link OG leak.

Carried into P1b: geo config keys must be stored UPPERCASE (resolveDestination
indexes `config.geo[cf.country]`, CF country is uppercase); password+unsafe
combo skips the unsafe interstitial after a correct password (low-pri edge).

**Sections done (P1a):** A (login + middleware gate), B (schema + migration),
C (full redirect engine), D (AE ingestion util), L (cron cleanup), M (bindings,
config flags, worker wrapper, theme/providers, i18n baseline, landing/dashboard
shell). Remaining P1 work: P1b (G + H), P1c (D queries + E).

**Orchestration constraint:** BKD worktrees branch from `origin/main` (which
lacks P1a — it is on `feat/sink-app`), so P1b/P1c cannot be cleanly
BKD-dispatched into a fresh worktree yet. Options: run in-session on
`feat/sink-app`, or land P1 on `main` first. Pending user decision.

### 2026-06-14 — P1a dispatched to BKD (worktree)

P1a runs in an isolated worktree based on `main`, so PMA docs are NOT in its
workspace — it builds from the self-contained inline spec + reference apps
(wepush) + tmp/Sink. The subtask owns code + self-review (/pma-cr); the
coordinator (this session) owns docs/tracking and the post-completion merge.
On completion the subtask moves itself to `review` and posts a summary
follow-up. (The original simple-mode issue `wt3cdi2y` was deleted and recreated
as worktree issue `hd2zbarw`.)
