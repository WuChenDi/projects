# PLAN-006 Sink P5 — dashboard & link-management enhancements

- **status**: in progress
- **createdAt**: 2026-06-25 06:50
- **approvedAt**: (pending)
- **relatedTask**: FEAT-013, FEAT-014, FEAT-015, FEAT-016, FEAT-017

## Context

Sink (`apps/sink`) is feature-complete against the upstream ccbikai/Sink parity
goals (PLAN-001..005, all done). A fresh full scan surfaced five genuine,
code-verified gaps in day-to-day usability — not parity items, but the next
layer of polish for an operator using the dashboard daily.

Verified current state:

- **Overview is a stub.** `app/dashboard/(app)/page.tsx` renders a single
  "Total Links" card hardcoded to `—` with the i18n string `dashboard.overview.comingSoon`.
  No real metrics.
- **Links list has no click data and no analytics entry point.**
  `components/dashboard/links/links-view.tsx` shows only copy/edit/delete/QR per
  row — no visit count column, no "view this link's stats" action. The analytics
  backend already supports a per-`slug` filter (`components/dashboard/analytics/analytics-view.tsx`
  holds a `filters` record; `lib/analytics-query.ts` exposes `slug` as a
  dimension), but it is unreachable from a link.
- **No link organization.** `database/schema.ts` `links` has only a free-text
  `comment`; no tags/labels/folders. List supports search + pagination only.
- **No click limit.** `LinkConfig` (`database/schema.ts`) and `schemas/link.ts`
  expose only time-based `expiresAt`. No "expire after N visits".
- **No enable/disable.** A link can only be soft-deleted; there is no way to
  temporarily pause a link without losing it.

Design anchor — minimize migration surface: existing behaviour flags
(`cloaking`, `unsafe`, `redirectWithQuery`, `passwordHash`) all live in the
`config` JSON column. Two of the five new fields (`disabled`, `maxVisits`) fit
the same pattern and need **no migration**. Only **tags** warrants a real column
(for list-side filtering), so the schema change is a single additive column,
emitted incrementally by drizzle-kit (PMA rule 10 — never hand-write migrations).

## Proposal

Five independent slices, one task each. Order reflects value, not dependency —
none blocks another.

### FEAT-013 — Overview real metrics (P2)

Replace the placeholder card with live numbers.

- `app/dashboard/(app)/page.tsx` — fetch and render:
  - **Total links** — count of non-deleted links.
  - **Total visits** (range-windowed, e.g. last 30d) — from Analytics Engine.
  - **Top links** — small list of highest-traffic slugs (reuse the per-slug
    aggregation already in `lib/analytics-query.ts` used by `stats/export`).
- Backend: add a lightweight count to the link layer (`lib/links.ts` —
  `countLinks(env)` → `SELECT count(*) WHERE is_deleted = 0`) exposed via a new
  `GET /api/link/count` (or fold into an existing list response as a `total`).
  Reuse `stats/counters` + the per-slug query for visit totals / top links; no
  new analytics query if the existing ones suffice with a wider window.
- Drop `dashboard.overview.comingSoon`; add real i18n keys (en/zh).

### FEAT-014 — Per-link clicks + analytics drill-down (P2)

Make a link's traffic reachable in one click.

- `components/dashboard/links/links-view.tsx` — add a **clicks** column and an
  **Analytics** row action. Clicks for the visible page are fetched in one batch
  call keyed by slug (avoid N requests).
- Backend: a per-slug total-visits endpoint — either extend `GET /api/stats/counters`
  to accept a `slug` filter (verify it already threads `filters` to
  `lib/analytics-query.ts`) or add `GET /api/stats/link?slug=` returning
  `{ visits, visitors }`. Prefer reusing `counters` with a slug filter.
- **Analytics** action → navigate to `/dashboard/analytics?slug=<slug>` with the
  filter pre-applied. `analytics-view.tsx` already drives off a `filters` record;
  add reading an initial `slug` from the URL query into that state.
- i18n: `links.clicks`, `links.viewAnalytics` (en/zh).

### FEAT-015 — Link tags (P2)

Lightweight organization without folders.

- `database/schema.ts` — add `tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([])`
  to `links`. Run `pnpm --filter @cdlab996/sink db:gen` to emit an **incremental**
  migration (tool-generated). Add `tags` to the `Link` type consumers.
- `schemas/link.ts` — add `tags: z.array(z.string().trim().min(1).max(32)).max(20).optional()`
  to create/edit/import schemas; thread through `lib/links.ts` create/update.
- Editor (`components/dashboard/link-editor/`) — a tag input (add/remove chips).
- List (`links-view.tsx`) — render tag chips per row + a tag filter control.
  Server-side filter via `LIKE` on the JSON text in `lib/links.ts` list query,
  or (simpler, given `LIST_QUERY_LIMIT` scale) client-side filter on the loaded
  page — decide at implementation time, default to the simpler client-side.
- i18n: `links.tags`, `links.addTag`, `links.filterByTag` (en/zh).

### FEAT-016 — Click-limit expiration / maxVisits (P3)

Expire a link after N visits, alongside the existing time expiry.

- `database/schema.ts` `LinkConfig` + `schemas/link.ts` `LinkConfigInputSchema`
  — add optional `maxVisits?: number` (positive int). **No migration** (config JSON).
- Durable counter: increment a **KV counter** `visits:{id}` in the redirect path
  (`app/[slug]/route.ts` / `lib/links.ts`) inside the existing `ctx.waitUntil`
  side-effect, and check `count >= maxVisits` before redirecting — treat an
  exceeded link like an expired one (purge KV + serve `notFound`). KV is the
  existing hot-path store, so no new binding.
- Editor — a "max visits" number field next to the expiry picker.
- i18n: `links.form.maxVisits` (en/zh).

**Design note / risk:** KV is eventually consistent, so under concurrency the
limit is approximate (may overshoot by a few hits). Acceptable for this use case.
The alternative — a D1 `visit_count` column incremented on every redirect — adds
a write to the hot redirect path and is rejected for cost. Surfaced for approval.

### FEAT-017 — Enable/disable (pause) toggle (P3)

Temporarily disable a link without deleting it.

- `database/schema.ts` `LinkConfig` + `schemas/link.ts` — add optional
  `disabled?: boolean`. **No migration** (config JSON).
- Redirect path (`app/[slug]/route.ts`) — when `config.disabled`, serve the same
  path as `notFound` (404 / `NOT_FOUND_REDIRECT`), before logging a normal hit.
- List (`links-view.tsx`) — a per-row enable/disable toggle (reuses
  `PUT /api/link/edit`) + a muted/"disabled" visual state.
- i18n: `links.disable`, `links.enable`, `links.disabled` (en/zh).

## Risks

- **Schema change (FEAT-015 only).** Single additive `tags` column with a
  default — backward compatible; emitted by drizzle-kit incrementally, never
  hand-edited. Existing rows default to `[]`.
- **maxVisits accuracy (FEAT-016).** KV eventual consistency → approximate
  limit (see design note). No hard-guarantee enforcement.
- **Hot redirect path.** FEAT-016/017 add one KV read + a config check before
  redirect. FEAT-017 is a pure in-memory check (config already loaded);
  FEAT-016 adds a KV counter read/write — keep both inside the existing cache
  lookup / `waitUntil` flow, no extra round-trips on the cache-hit path beyond
  the counter.
- **Analytics filter coupling (FEAT-014).** Reusing `stats/counters` with a slug
  filter assumes the query layer threads `filters` for `slug`; verify before
  building, else add a thin `stats/link` endpoint.
- **i18n drift.** Every new string lands in both `messages/en.json` and
  `messages/zh.json`.

## Scope

In: the five slices above (overview metrics, per-link clicks + drill-down, tags,
maxVisits, enable/disable), their API/editor/list wiring, one additive migration
(tags), en/zh i18n.

Out (recorded, not implemented): programmatic API token / machine auth (separate
PLAN — better-auth `apiKey` plugin + per-route auth change), bulk multi-select
operations, custom-domain management UI, favicon/preview thumbnails, advanced
list filters (expired / expiring-soon status facets). Per-user link ownership
remains out — the app stays single-workspace.

## Alternatives

- **tags in `config` JSON vs a column.** JSON avoids the migration but makes
  server-side tag filtering hard (JSON blob). A column enables `LIKE`/indexable
  filtering and a clean `Link.tags` type. Chose the column; it is the only
  migration in this plan.
- **maxVisits counter store.** KV (chosen, cheap, approximate) vs D1 column
  (exact, but a write on every redirect) vs Analytics Engine (real-time-unsuitable).
- **disabled column vs config flag.** A dedicated column would ease list-status
  filtering, but config-flag matches the existing behaviour-flag pattern and
  needs no migration. Chose config flag.

## Annotations

- 2026-06-25 — Scope selected by user as "方案 A": FEAT-013 + 014 + 015 + 016 +
  017 in one plan. API-token work explicitly deferred to a future separate plan.
  Docs-only this round; no code generated pending implementation approval.
