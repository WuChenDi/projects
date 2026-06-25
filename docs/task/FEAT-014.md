# FEAT-014 Sink P5b — per-link clicks + analytics drill-down

- **status**: done
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-06-25 06:50

## Description

Surface a link's traffic from the links list. Today
`components/dashboard/links/links-view.tsx` has no visit count and no path into
analytics, even though the analytics backend already supports a per-`slug`
filter.

Add a **clicks** column (batch-fetched per visible page, one call keyed by slug)
and an **Analytics** row action linking to `/dashboard/analytics?slug=<slug>`
with the filter pre-applied. Backend: reuse `GET /api/stats/counters` with a
`slug` filter if the query layer threads it (verify `lib/analytics-query.ts`),
otherwise add a thin `GET /api/stats/link?slug=` returning `{ visits, visitors }`.
`analytics-view.tsx` must read an initial `slug` filter from the URL query.

## Acceptance Criteria

Links list shows per-link click counts (single batch call, not N); Analytics
action opens analytics pre-filtered to that slug; build + biome clean; en/zh
i18n (`links.clicks`, `links.viewAnalytics`).

## ActiveForm

Adding per-link click counts and analytics drill-down.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-006 §FEAT-014. Verify `stats/counters` slug-filter support before
adding a new endpoint.
