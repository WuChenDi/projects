# FEAT-009 Sink P4a — realtime WebGL globe + locations feed

- **status**: completed
- **priority**: P2
- **owner**: feat/sink-app session
- **createdAt**: 2026-06-16 09:50

## Description

Close the realtime-page visual gap vs the reference:
- ~~`GET /api/logs/locations`~~ — **not needed**: the existing
  `GET /api/location` (`locationSql`, lat/lng `double1`/`double2` +
  `SUM(_sample_interval)` weighted points, time-filtered, site-token gated)
  already returns exactly the globe feed. Reused via `statsApi.location`.
- React WebGL globe (`cobe`) rendering live visit points from that feed;
  lazy-loaded + SSR-skipped like the world map.
- Animated incoming-visit feed on the realtime page (new event rows play an
  `animate-in` entrance; only genuinely new rows animate on each poll).

## Acceptance Criteria

Build + biome clean; reuses `/api/location` (weighted geo points, degrades
gracefully without AE creds, 401 gate); globe renders points and is lazy/
SSR-safe; en/zh i18n. — **tsc + biome clean; verified.**

## ActiveForm

Building the realtime globe + locations feed.

## Dependencies

- **blocked by**: (none) — but verify `extractAccessLog`/`writeAccessLog` write
  lat/lng to AE first, else the feed is empty.
- **blocks**: (none)

## Notes

See PLAN-004 §FEAT-009. Decision applied: **`cobe`** (tiny WebGL, no asset
pipeline), not the bespoke globe. Added `cobe@^2.0.1` to `apps/sink`. New file
`components/dashboard/realtime/globe.tsx`; wired into `realtime-view.tsx`.
cobe v2 has no internal render loop, so rotation/markers are driven from our own
rAF. Endpoint reused (`/api/location`) — no new route added.
