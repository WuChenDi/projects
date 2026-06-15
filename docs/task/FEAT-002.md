# FEAT-002 Sink P2a — stats/logs backend (heatmap, location, logs)

- **status**: completed
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-06-14 10:30

## Description

Add AE-backed, site-token-gated endpoints that degrade gracefully when AE
credentials are absent (`configured:false`), reusing `analytics-query.ts`:

- `GET /api/stats/heatmap` — weekday × hour grid (visits/visitors), range + filters.
- `GET /api/location` — aggregated lat/lng points with counts.
- `GET /api/logs/events` — recent raw events (slug, geo, ua-derived, timestamp).
- `GET /api/logs/locations` — lat/lng points for map/globe.

Extend the client `statsApi` with `heatmap`, `location`, `logs.events`,
`logs.locations`. New SQL builders in `analytics-query.ts`.

## Acceptance Criteria

Build + biome clean; endpoints 401 without token, return `configured:false`
without AE creds, and valid shapes with creds; en/zh keys where surfaced.

## ActiveForm

Building the P2 stats/logs backend endpoints.

## Dependencies

- **blocked by**: (none — P1c AE helper exists)
- **blocks**: FEAT-003 (map/heatmap), FEAT-004 (realtime)

## Notes

See PLAN-002 §P2a. Sink refs: server/api/stats/heatmap, location, logs/events,
logs/locations.
