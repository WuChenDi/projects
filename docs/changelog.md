# Changelog

## 2026-06-17 [feature]

FEAT-012 / PLAN-005 done. Replaced Sink's shared `SITE_TOKEN` Bearer gate with
**better-auth** (`^1.6.19`) social login — **Google + GitHub only, login ==
registration** (no email/password). Backed by the existing Drizzle D1/libsql DB.

- Schema: added better-auth `user`/`session`/`account`/`verification` tables.
  Init migration **regenerated from scratch** (`0000_fair_luckman.sql`, 5 tables)
  — old init deleted per approval, no data preserved.
- `lib/auth.ts`: `getAuth()` (per-request, drizzle adapter, `socialProviders`
  google+github gated by env, `nextCookies()`) + `requireSession()` guard
  replacing `requireSiteToken`. Mounted handler at `/api/auth/[...all]`.
  `lib/auth-client.ts` added.
- Swapped `requireSiteToken` → `await requireSession` in all 23 `/api/*` routes;
  deleted `/api/verify`. Dashboard `(app)/layout.tsx` now does a server-side
  `getSession` + `redirect('/dashboard/login')`; deleted client `SiteTokenGate`
  and `stores/auth-store.ts`.
- Login page → two social buttons (i18n en/zh, inline Google/GitHub SVGs since
  lucide `Github` was removed in v1). `lib/api.ts` dropped all Bearer/authHeader
  wiring (session cookie is same-origin automatic). `env.ts` dropped `siteToken`.
- Env/docs: `wrangler.jsonc` swapped `SITE_TOKEN`→`BETTER_AUTH_URL` (secrets via
  `.dev.vars`/`wrangler secret`); `.env.example`, README, `cloudflare-env.d.ts`
  (cf-typegen) updated.
- OpenNext note: no `runtime='edge'` needed (vs the flox next-on-pages port).
- Verify: `next build` + `tsc` + biome all clean.
- External setup required before login works: create Google + GitHub OAuth apps,
  callback `{BETTER_AUTH_URL}/api/auth/callback/{google|github}`, set
  `BETTER_AUTH_SECRET` + client id/secret in `.env`. Caveat: any Google/GitHub
  account can sign in (open access) — add an allowlist later if needed.
- Login UI: adopted the shadcn `login-04` layout (centered brand + 2-col social
  button grid, `Field`/`FieldGroup` from `@cdlab996/ui`). Added public Privacy
  Policy + Terms of Service pages at `/dashboard/privacy` + `/dashboard/terms`
  (styled after the ikui pages, content adapted to Sink's actual data
  practices; English text, sibling to `/dashboard/login` so outside the auth
  gate; `dashboard` is already a reserved slug so no `[slug]` conflict). Login
  footer links to both via `t.rich('agreement')` (en/zh).
- Sidebar footer: replaced the bare sign-out button with a `NavUser` card
  (`components/dashboard/nav-user.tsx`) — avatar (image or initials fallback) +
  name/email, opening a dropdown (`useSession` from better-auth) with Theme +
  Language radio submenus, Docs + GitHub repo links, and Sign out. Theme/Language
  thus moved out of the dashboard header (removed the now-duplicate header
  `ThemeToggle`/`LocaleSwitcher`; both still used on the landing + settings
  pages). i18n `userMenu.*` (en/zh).

## 2026-06-16 09:50 [progress]

Full re-scan of `apps/sink` vs the reference `tmp/Sink` to find remaining
feature gaps after P1–P3. Verified each candidate against port source.
Confirmed gaps: realtime WebGL globe + `/api/logs/locations` (B was deferred in
PLAN-001), AI OG metadata (`og-ai`), auto Safe-Browsing on create/edit
(`detectUnsafeLink` — port only checks on-demand), i18n breadth (10→2 locales) +
localized redirect interstitials; deferred polish: animated realtime
notifications, custom analytics date picker, marketing landing sections.
Captured as PLAN-004 + FEAT-009..011 and BKD cards (tags `sink`,`P4`).
Documents only — no implementation. Awaiting approval on globe port-vs-replace
and i18n full-vs-subset.

## 2026-06-16 11:10 [progress]

FEAT-009 done (P4a). Realtime WebGL globe via `cobe@^2.0.1`
(`components/dashboard/realtime/globe.tsx`, lazy + `ssr:false`, self-driven rAF
since cobe v2 has no render loop). **No new endpoint** — the existing
`/api/location` (`locationSql`, weighted lat/lng points) already is the globe
feed, reused via `statsApi.location`. Realtime event rows now play an
`animate-in` entrance for genuinely-new rows only. i18n `realtime.globe.*`
(en/zh). tsc + biome clean. Card → review.

## 2026-06-16 11:45 [progress]

FEAT-010 done (P4b). AI OG: `lib/ai-og.ts` (`generateAiOg` — Workers AI +
hostname fallback, `AI_OG_PROMPT`), `GET /api/link/og-ai` (site-token gated),
`linkApi.aiOg`, editor "AI fill" button on the OG section (`links.form.aiOg`
en/zh). Auto Safe-Browsing: `lib/safe-browsing.ts` (`safeBrowsingHost` extracted
from `health-check.ts` + `isUnsafeUrl`); `links.ts` `buildConfig` now auto-flags
`config.unsafe` on a DoH hit when not explicitly set (best-effort, no-op without
`SAFE_BROWSING_DOH`). tsc + biome clean. Card → review.

## 2026-06-16 12:30 [fix]

Fixed `/dashboard/settings` 404. The shell nav linked `/dashboard/settings`
(`dashboard.nav.settings`) but no route existed. Added
`dashboard/(app)/settings/page.tsx` + `components/dashboard/settings/
settings-view.tsx` — Appearance (`ThemeToggle`), Language (`LocaleSwitcher`),
System status (R2 + Analytics via `/api/config`). i18n `settings.*` (en/zh).
tsc + biome clean. BKD card `fzx10b9k` → review.

## 2026-06-16 12:10 [progress]

FEAT-011 done (P4c) → PLAN-004 complete. Redirect interstitials localized:
`lib/html.ts` password/unsafe pages carry en/zh string tables; new
`resolveRedirectLocale(request)` in `lib/redirect.ts` (NEXT_LOCALE cookie →
Accept-Language → default); `app/[slug]/route.ts` passes the locale. P4 all
three slices (FEAT-009..011) implemented in-session, tsc + biome clean; cards in
review. Deferred polish (custom date picker, landing sections) not built.

## 2026-06-16 10:20 [decision]

PLAN-004 approved. Decisions: (1) realtime globe → light lib `cobe` (no port of
the bespoke WebGL globe / binary asset pipeline); (2) i18n stays en/zh only —
FEAT-011 narrowed from "locale breadth + interstitials" to localizing the
redirect interstitials for en/zh (no new locale files). PLAN-004 → approved/
implementing; FEAT-011 retitled. Implementation not yet started (awaiting go +
slice order).

## 2026-06-14 05:23 [decision]

Started PMA tracking for FEAT-001 (rebuild `apps/shortener` as a Sink-like
Next.js app). Settled the storage architecture: **D1/Drizzle as source of truth
+ KV as redirect cache** (hybrid), rejecting Sink's pure-KV model and an
all-in-one-JSON-column variant. Schema is two-layer: indexed real columns for
queryable/uniqueness/cron fields, one JSON `config` column for rich link
options. See PLAN-001.

## 2026-06-14 05:23 [progress]

Created `docs/task` and `docs/plan` tracking structure. FEAT-001 / PLAN-001
drafted. Awaiting approval on open decisions (phase boundaries, replace-vs-new
app, auth model, i18n timing) before implementation.

## 2026-06-14 05:35 [progress]

Deep-dived Sink (config, schemas, redirect middleware, access-log dimensions,
dashboard pages, editor advanced options, stats/logs/link/migrate APIs) and
wrote a full **Feature Inventory** into PLAN-001 — sections A–M, every item
phase-tagged (P1/P2/P3) as a checkbox checklist. Still draft; pending approval
on the 4 open decisions.

## 2026-06-14 05:42 [decision]

All open decisions resolved with user (PLAN-001 Annotations): new app
`apps/sink` (greenfield, not a shortener replace); site-token (env) Bearer
auth; **multi-domain retained** via `(slug, domain)` composite unique key
(sha256 hash layer dropped); P1 split P1a→P1b→P1c; default redirect 308;
wepush frontend stack; `@cdlab996/genid`; Sink AE dimension layout; **i18n
(en/zh) baked into P1**; WebGL globe + map/heatmap + OpenAPI not built
(placeholders). Plan still draft pending one multi-domain interpretation
confirmation, then `proceed` for P1a.

## 2026-06-14 05:55 [progress]

User confirmed option A + greenfield (no migration script). PLAN-001 →
implementing; FEAT-001 → in_progress. P1 sliced into BKD issues under project
`projects` (tags `sink`,`FEAT-001`, status `todo`): `wt3cdi2y` P1a (scaffold +
schema + auth + redirect), `u3wuz8f7` P1b (link mgmt + AI slug), `l0huhojt`
P1c (analytics). Dependency P1a→P1b→P1c. Not yet dispatched — awaiting
go-ahead.

## 2026-06-14 06:05 [progress]

Committed PMA docs to `feat/sink-app`. Dispatched **P1a** to BKD for autonomous
execution: recreated as worktree issue `hd2zbarw` (worktree off `main`),
engine claude-code / claude-opus-4-8[1m], now `working`. Subtask builds
apps/sink from the self-contained spec + reference apps, self-reviews
(/pma-cr), then moves to `review` and reports back. Coordinator (this session)
handles tracking + merge. P1b `u3wuz8f7` / P1c `l0huhojt` remain `todo`.

## 2026-06-14 07:05 [progress]

**P1a complete and merged** into `feat/sink-app`. New app `apps/sink` (51
files): Next/OpenNext scaffold, Drizzle `links` schema (config JSON,
`UNIQUE(slug, domain)`) + baseline migration, dual-driver `getDb`, site-token
auth + login + `/api/verify`, redirect engine (`app/[slug]` GET/POST + `/og`:
KV cache, geo/device routing, password gate, unsafe interstitial, social-bot
OG, AE access log, reserveSlug), analytics util, cron cleanup, cookie-based
i18n (en/zh), dashboard shell, landing. Build + biome pass; dev + redirect
e2e verified by the subtask.

Coordinator independently re-ran build/biome and a /pma-cr pass; fixed 3
findings (commit 7a846d9): apple-UA over-match (desktop macOS → App Store),
relative `notFoundRedirect` throwing in `Response.redirect`, non-constant-time
site-token compare. The subtask's own /pma-cr had already caught and fixed a
password-link OG destination leak. BKD issue `hd2zbarw` → done.

## 2026-06-14 07:05 [pitfall]

**Orchestration constraint**: BKD worktrees branch from `origin/main` (priority
over local `main`), which does NOT contain P1a (it lives on `feat/sink-app`).
So dependent phases P1b/P1c cannot be BKD-dispatched into a fresh worktree
without P1a present — they must either run in-session on `feat/sink-app`, or
wait until P1 lands on `main`. Decision pending with user.

## 2026-06-14 08:45 [progress]

**P1b complete** (in-session on `feat/sink-app`, commit `7114375`). User chose
to run dependent phases in-session rather than push WIP to main. Delivered:
link API (list/query/search/create/edit/upsert/delete/ai-slug, all site-token
gated, KV cache invalidation on mutate), repository CRUD (slug validation,
per-domain uniqueness with soft-delete revive, Argon2id password hashing, geo
keys uppercased), `/dashboard/links` (table, debounced server search, sort,
pagination, copy, QR, delete) and `/dashboard/link` editor (basic + advanced
accordion: settings/OG/device/geo, random + AI slug), AI slug with random
fallback + KV cache, en/zh i18n, `qrcode` dep.

Verified end-to-end against local D1 (dev server): create (custom + auto slug),
duplicate-slug 409, list, search, edit, delete; password-gate redirect (200
form); **edit/delete invalidate the redirect cache** (308 reflects new url,
404 after delete); AI fallback slug. Build + biome clean. BKD `u3wuz8f7` → done.

## 2026-06-14 09:30 [progress]

**P1c complete — P1 done.** Analytics dashboard on `feat/sink-app` (commit
`886a3c3`). Delivered: AE SQL query helper (field map matching ingestion,
sampling-weighted visitors, range + drill-down filters, sanitized literals);
stats API (counters/views/metrics, site-token gated, graceful `configured:false`
without AE creds); `/dashboard/analytics` (range selector, counters cards,
recharts views chart, metric groups with tabs + click-to-filter drill-down,
removable filter bar, map/realtime placeholders); CLOUDFLARE_ACCOUNT_ID/
API_TOKEN wiring; en/zh i18n; recharts dep.

Verified locally: stats degrade gracefully without AE creds, invalid type 400,
auth 401, analytics page 200. Build + biome clean. BKD `l0huhojt` → done.

**P1 (P1a + P1b + P1c) complete** on `feat/sink-app`. Remaining: P2/P3
(realtime, map/heatmap, health check, migrate/backup, image upload, UTM,
country picker) — not yet scheduled.

## 2026-06-14 09:35 [BUG-P1]

Automated commit security review flagged a SQL-injection in
`analytics-query.ts` `sanitize()`: it doubled single quotes but left backslash
unescaped, and Analytics Engine SQL (ClickHouse) treats backslash as a
string-literal escape — a value ending in `\` could escape the closing quote
and break out. **Second-order exploitable**: drill-down filter values are
visitor-controlled analytics dimensions (referer/slug). Fixed (commit
`edfdd20`) to escape backslash then quote. Build + biome clean.

## 2026-06-14 09:50 [progress]

Refactored the QR dialog to reuse the shared `@cdlab996/ui/components/qr-code`
component (canvas + `ref.download`) instead of a bespoke `qrcode`/`<img>`
implementation; removed `qrcode` + `@types/qrcode` from `apps/sink`. Declared
`@types/qrcode` in `@cdlab996/ui` dependencies so the raw-source component
typechecks for consumers. Build + biome clean (commit `635db96`).

## 2026-06-14 10:00 [progress]

Pushed `feat/sink-app` and opened **PR #38**
(https://github.com/WuChenDi/projects/pull/38) — "feat(sink): rebuild shortener
as a Sink-like Next.js app (P1)". Includes the untracked `@cdlab996/ui` QRCode
component (`b3bb20c`) and a QR scannability fix (`68152d5`: fixed black/white +
quiet zone). 89 files. P1 (P1a+P1b+P1c) complete; P2/P3 not included.

## 2026-06-14 11:30 [progress]

**P2 complete** (P2a–d), in-session on `feat/sink-app`, **uncommitted** pending
the user's commit decision. BKD cards `1jw4hg6n`/`iixw16z9`/`d2s5537y`/`ipjia79l`
→ done.

- P2a: `/api/stats/heatmap`, `/api/location`, `/api/logs/events` + AE SQL builders
  + client `statsApi` extensions. (logs/locations skipped — no globe.)
- P2b: analytics world bubble map (`react-simple-maps` + `/world-110m.json`,
  `next/dynamic` ssr:false) + CSS-grid heatmap, wired to range+filters,
  replacing the placeholders.
- P2c: `/dashboard/realtime` — live event feed (poll, pauses when tab hidden) +
  realtime views chart (1h/6h/24h). No globe (decided). Nav item added.
- P2d: `POST /api/link/check` (bounded concurrency/timeout, cap 100, site-token
  gated) + Safe Browsing via DoH (`SAFE_BROWSING_DOH`) + `/dashboard/check` UI.

Deps added: `react-simple-maps` (+ `@types/...`, `world-atlas` topojson asset).
Build + biome clean. Smoke-tested locally: endpoints 401-gate + degrade
gracefully without AE creds; realtime/check pages render; `/api/link/check` ran
end-to-end (real fetch, 200). **Caveat**: the world map's runtime render with
real geo points is unverified locally (AE has no data in dev) — verify on deploy.

## 2026-06-14 11:45 [BUG-P1]

Automated commit security review flagged **HIGH SSRF** in `health-check.ts`:
`/api/link/check` fetched user-stored destination URLs server-side without
host validation (cloud-metadata / internal-service reach). The deployed Worker
already runs with `global_fetch_strictly_public` (platform blocks private/
DNS-rebound targets), but local dev / preview use Node fetch which does not.
Added an app-level guard (`validateFetchUrl`): http/https only, reject userinfo,
block loopback/private/link-local (incl. 169.254.169.254)/unique-local IPv4+IPv6
and `localhost`/`.local`/`.internal`; switched to `redirect: 'manual'` so 3xx
is treated as reachable without chasing the Location into an internal host.
Verified locally: `http://127.0.0.1/admin` → `blocked`, public URL → 200 ok.
Still uncommitted.

## 2026-06-14 12:30 [progress]

**P3 complete (P3a/P3b/P3c)** — full Sink parity — in-session on `feat/sink-app`,
**uncommitted** pending the user's commit decision. BKD cards `qco9cw3g`/
`6thmki2b`/`u5jtpagr` → done; FEAT-006/007/008 + PLAN-003 completed; FEAT-001
(umbrella) marked complete (P1+P2+P3 delivered).

- P3a migrate: `/api/link/export` + `/api/link/import` (non-destructive, fresh
  id) + `/api/stats/export` CSV + `/dashboard/migrate`.
- P3b R2 (config-gated, opt-in): `/api/config` flags, `/api/upload/image` +
  `/api/asset/[...key]` (og/-only, image-only), `/api/backup` + cron backup;
  editor OG uploader + migrate backup card gated on R2. Binding commented in
  wrangler by default → graceful 503/r2:false; deploy = create bucket + uncomment.
- P3c editor: ISO country picker (Command combobox, Intl.DisplayNames + flags) +
  UTM builder. Added `cmdk` to `@cdlab996/ui` (shipped command.tsx needed it).

Verified locally: migrate round-trip; R2 both states (off graceful / on full:
upload→asset→backup, validation, og-prefix guard); editor pages render. Build +
biome clean. Deps: react-simple-maps (P2b), cmdk (ui). Tooling note: cleared an
orphaned next-dev process holding the nsl `sink.localhost` route during testing.
