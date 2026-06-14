# Changelog

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
per-domain uniqueness with soft-delete revive, PBKDF2 password hashing, geo
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
