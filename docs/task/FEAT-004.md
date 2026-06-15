# FEAT-004 Sink P2c — realtime page

- **status**: completed
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-06-14 10:30

## Description

New `/dashboard/realtime` page (site-token gated via the `(app)` layout) + a
shell nav item:

- Live event log feed (polling `GET /api/logs/events`, paused when tab hidden).
- Realtime visits chart + time-window picker (reuse `viewsSql` hour buckets).
- WebGL globe — not built (decided): chart + log feed only.

## Acceptance Criteria

Build + biome clean; live feed updates on interval; chart renders; graceful
empty/unconfigured states; en/zh i18n.

## ActiveForm

Building the realtime dashboard page.

## Dependencies

- **blocked by**: FEAT-002 (logs endpoints)
- **blocks**: (none)

## Notes

See PLAN-002 §P2c. **Decided**: no globe — chart + log feed only.
