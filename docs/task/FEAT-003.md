# FEAT-003 Sink P2b — world map + heatmap on analytics page

- **status**: completed
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-06-14 10:30

## Description

Replace the analytics page map/heatmap placeholder (from P1c):

- World map: country choropleth (lib TBD — see PLAN-002 decision #1).
- Heatmap: weekday × hour grid from `GET /api/stats/heatmap`.
- Wire both into the existing date-range + drill-down filter state in
  `AnalyticsView`. Keep them client-only / lazy-loaded.

## Acceptance Criteria

Build + biome clean; map + heatmap render from real/empty AE data; respect
filters; graceful empty state when not configured; en/zh i18n.

## ActiveForm

Building the analytics world map and heatmap.

## Dependencies

- **blocked by**: FEAT-002 (heatmap/location endpoints)
- **blocks**: (none)

## Notes

See PLAN-002 §P2b. **Decided**: `react-simple-maps` (country choropleth) +
dependency-free CSS grid (heatmap).
