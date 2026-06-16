# FEAT-006 Sink P3a — migrate (export / import / access-log CSV)

- **status**: completed
- **priority**: P3
- **owner**: (unassigned)
- **createdAt**: 2026-06-14 12:00

## Description

Self-contained migrate features (no R2):
- `GET /api/link/export` — JSON `{version,exportedAt,count,links}` of active links.
- `POST /api/link/import` — upsert from JSON by `(slug,domain)`; report
  `{success,skipped,failed}`.
- `GET /api/stats/export` — access-log CSV (AE; reuse analytics-query).
- `/dashboard/migrate` page + nav item: export download, import file upload,
  access-log CSV export. All site-token gated.

## Acceptance Criteria

Build + biome clean; export/import round-trips a link; import reports counts;
CSV degrades gracefully without AE creds; 401 gate; en/zh i18n.

## ActiveForm

Building the migrate (export/import/CSV) features.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-003 §P3a. Format decision in PLAN-003 #2.
