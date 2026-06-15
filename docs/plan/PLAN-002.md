# PLAN-002 Sink P2 — analytics enrichment, realtime, health check

- **status**: completed
- **createdAt**: 2026-06-14 10:30
- **approvedAt**: 2026-06-14 10:45
- **completedAt**: 2026-06-14 11:30
- **relatedTask**: FEAT-002, FEAT-003, FEAT-004, FEAT-005

## Context

P1 (P1a+P1b+P1c) is complete on `feat/sink-app` (PR #38): scaffold + redirect
engine, link management + AI slug, analytics dashboard (counters / views /
metric groups). P1c intentionally left **placeholders** for a world map +
heatmap and for a realtime view (decisions #10/#11 in PLAN-001), and the link
**health check** page was never started. P2 fills these.

Existing building blocks to reuse:
- `src/lib/analytics-query.ts` — AE SQL helper (FIELD map, `whereClause`,
  `executeAeSql`, sampling-weighted `VISITORS`, `parseStatsQuery`,
  `isConfigured`, graceful `AnalyticsNotConfiguredError`).
- `src/lib/api.ts` — `statsApi` client + `request()` (site-token Bearer).
- `/dashboard/analytics` `AnalyticsView` — range + drill-down filter state, the
  two `PlaceholderCard`s to replace.
- Dashboard shell nav (`components/dashboard/shell.tsx`) — add `realtime` +
  `check` items.
- AE write order (`src/lib/analytics.ts`): blobs slug,url,ua,ip,referer,country,
  region,city,timezone,language,os,browser,browserType,device,deviceType,colo,
  domain; doubles latitude,longitude; built-in `timestamp`, `_sample_interval`.

Feature reference (Sink, Nuxt) at `tmp/Sink`: `server/api/stats/heatmap.get.ts`,
`server/api/location.get.ts`, `server/api/logs/events.get.ts`,
`server/api/logs/locations.get.ts`, `server/api/link/check.post.ts`; dashboard
`layers/dashboard/app/pages/dashboard/{realtime,check}.vue` and the
`analysis/metrics/Locations.vue` + `analysis/Heatmap.vue` components.

## Proposal

Four independently-verifiable slices (tasks FEAT-002..005). Each: build + biome
clean, site-token-gated APIs that degrade gracefully when AE creds are absent,
en/zh i18n, local smoke test.

### P2a — stats/logs backend (FEAT-002)
New AE-backed, site-token-gated endpoints (graceful `configured:false`):
- `GET /api/stats/heatmap` — weekday × hour grid (`visits`/`visitors`), range +
  filters.
- `GET /api/location` — aggregated lat/lng points (rounded) with counts.
- `GET /api/logs/events` — recent raw events (slug, country, city, os, browser,
  device, timestamp), newest first, small limit.
- `GET /api/logs/locations` — lat/lng points for map/globe.
Extend `statsApi` (client) with `heatmap`, `location`, `logs.events`,
`logs.locations`. New SQL builders in `analytics-query.ts`.

### P2b — map + heatmap on the analytics page (FEAT-003)
Replace the analytics map placeholder:
- World map: country choropleth from the existing `country` metric (or
  `/api/location`). **Lib decision needed** (see Annotations).
- Heatmap: weekday × hour grid from `/api/stats/heatmap` (custom CSS grid).
Wire both to the existing range + drill-down filters.

### P2c — realtime page `/dashboard/realtime` (FEAT-004)
- Nav item + route (client, site-token gated by the existing `(app)` layout).
- Live event log feed (polling `/api/logs/events`, auto-refresh interval).
- Realtime visits chart + time-window picker (reuse `viewsSql` with short
  hour-bucketed windows).
- WebGL globe — **decision needed** (build vs keep placeholder; see Annotations).

### P2d — link health check `/dashboard/check` (FEAT-005)
- Nav item + route.
- `POST /api/link/check` — given a set of link ids (or all), fetch each
  destination and report reachability (HTTP status / error), bounded
  concurrency + timeout. **Safe Browsing (DoH) optional — decision needed.**
- UI: config form, status tabs (all / ok / broken / unsafe), results table.

## Risks

- **Map/heatmap/globe libs**: no in-repo precedent (P1 used only recharts).
  Adding a map/globe lib increases bundle + needs an SSR-safe (client-only)
  integration on OpenNext. Keep them client components, lazy-loaded.
- **`/api/link/check` SSRF/abuse**: it fetches arbitrary stored destination
  URLs server-side. Must bound concurrency + timeout, cap count, and is
  site-token gated; document that it intentionally fetches user-stored URLs.
- **AE query cost/shape**: heatmap/location group-bys over large windows —
  cap ranges and LIMIT.
- Realtime polling load — use a sane interval (e.g. 10–15s) and pause when tab
  hidden.

## Scope

Medium. New API routes (`stats/heatmap`, `location`, `logs/*`, `link/check`),
new `analytics-query` builders, 2 new dashboard pages (realtime, check), map +
heatmap components, shell nav additions, i18n keys, possibly 1–2 new client
deps (map, optionally globe). `apps/shortener` untouched.

## Alternatives

- Map lib: `react-simple-maps` (lightweight, d3-geo based, closest to Sink) vs
  `@visx/geo` (more code, more control) vs `nivo` geo (heavier). Heatmap: custom
  CSS grid (no dep) vs recharts vs nivo.
- Globe: `cobe` (tiny, WebGL, no arcs) vs `react-globe.gl`/`three` (arcs, heavy)
  vs keep placeholder.
- Health check: HTTP-status-only (no dep) vs + Safe Browsing DoH lookup.

## Annotations

### 2026-06-14 — Open decisions blocking approval

1. **Map + heatmap lib (P2b)**: recommend `react-simple-maps` for the
   choropleth + a dependency-free CSS grid for the heatmap. OK?
2. **WebGL globe (P2c)**: build it (and which lib — `cobe` recommended for
   weight) or keep the realtime view as chart + log feed only?
3. **Health check scope (P2d)**: HTTP-status reachability only, or also Safe
   Browsing via DoH (`safeBrowsingDoh`)?
4. **Slice order / which slices are in scope now** — all four, or a subset?

> Per user workflow: do not implement, commit, or advance phases until
> explicitly told. This plan stays `draft` pending the decisions above.

### 2026-06-14 — Decisions resolved (user)

1. **Map + heatmap (P2b)**: `react-simple-maps` for the country choropleth +
   a dependency-free CSS grid for the heatmap.
2. **WebGL globe (P2c)**: **not built** — realtime is chart + log feed only.
   (`logs.locations` endpoint may still be skipped or kept minimal.)
3. **Health check (P2d)**: include **Safe Browsing via DoH** (`safeBrowsingDoh`)
   in addition to HTTP-status reachability.
4. **Scope**: do all four slices (P2a → P2b/P2c → P2d).

Planned as BKD tracking cards (project `projects`/`68ll1mkh`, tags `sink`,`P2`,
status `todo`):

- `1jw4hg6n` — Sink P2a: stats/logs backend → FEAT-002
- `iixw16z9` — Sink P2b: world map + heatmap → FEAT-003
- `d2s5537y` — Sink P2c: realtime page (chart + log feed) → FEAT-004
- `ipjia79l` — Sink P2d: link health check + Safe Browsing → FEAT-005

Execution will run **in-session** on `feat/sink-app` (same orchestration
constraint as P1b/P1c: BKD worktrees branch from `origin/main`, which lacks the
unmerged P1). Implementation starts only on an explicit per-slice go-ahead.

### 2026-06-14 — P2 complete (in-session, uncommitted)

All four slices done back-to-back on `feat/sink-app`; BKD cards → done. Build +
biome clean; smoke-tested locally. **Uncommitted** — awaiting the user's commit
decision (per workflow: commit after the batch, not per task).

- P2a `1jw4hg6n`: heatmap/location/events endpoints + AE builders + client api.
- P2b `iixw16z9`: react-simple-maps bubble map + CSS heatmap (placeholders gone).
- P2c `d2s5537y`: realtime page (event feed + chart, no globe).
- P2d `ipjia79l`: `/api/link/check` (bounded, gated) + Safe Browsing DoH + UI.

Deviations/notes: `logs/locations` not added (no globe); world-map runtime with
real geo points unverified locally (no AE data in dev) — verify on deploy;
react-simple-maps@3 has a React-18 peer (installs under React 19 with a peer
warning, renders fine).
