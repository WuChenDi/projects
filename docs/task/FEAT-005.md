# FEAT-005 Sink P2d — link health check page

- **status**: completed
- **priority**: P2
- **owner**: (unassigned)
- **createdAt**: 2026-06-14 10:30

## Description

New `/dashboard/check` page + shell nav item, and `POST /api/link/check`:

- API: given link ids (or all), fetch each destination and report reachability
  (HTTP status / error), with bounded concurrency + per-request timeout and a
  count cap. Site-token gated. **Includes Safe Browsing via DoH** (decided).
- UI: config form, status tabs (all / ok / broken / unsafe), results table.

## Acceptance Criteria

Build + biome clean; API 401 without token; bounded concurrency/timeout
enforced; results table renders statuses; en/zh i18n.

## ActiveForm

Building the link health check page.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-002 §P2d. **Security**: intentionally fetches user-stored destination
URLs server-side — must cap count, bound concurrency + timeout (SSRF/abuse
surface). Safe Browsing scope is decision #3.
