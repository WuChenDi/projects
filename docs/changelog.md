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
