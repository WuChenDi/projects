# FEAT-013 Sink P5a — overview real metrics

- **status**: review
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-06-25 06:50

## Description

Replace the placeholder dashboard overview with live metrics. Today
`app/dashboard/(app)/page.tsx` renders one "Total Links" card hardcoded to `—`
(`dashboard.overview.comingSoon`).

Render: total non-deleted links, total visits over a window (e.g. 30d), and a
small top-links list. Add `countLinks(env)` to `lib/links.ts` exposed via a
lightweight endpoint (or a `total` on an existing list response); reuse the
existing per-slug aggregation in `lib/analytics-query.ts` for visits / top links.
Drop the `comingSoon` string; add real en/zh i18n.

## Acceptance Criteria

Overview shows real total-links count and visit total; top-links list renders
from analytics; no hardcoded `—`; build + biome clean; en/zh i18n complete.

## ActiveForm

Wiring real metrics into the dashboard overview.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-006 §FEAT-013.
