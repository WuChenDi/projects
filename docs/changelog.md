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
