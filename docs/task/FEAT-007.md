# FEAT-007 Sink P3b — R2 backup + OG image upload

- **status**: completed
- **priority**: P3
- **owner**: (unassigned)
- **createdAt**: 2026-06-14 12:00

## Description

Needs an R2 binding (`R2`, bucket `sink`):
- `POST /api/backup` (manual) + cron scheduled backup → links JSON to R2.
- `POST /api/upload/image` (multipart → R2, type/size validated) +
  `GET /api/asset/[...key]` serving; wire the uploader into the editor OG image
  field.

## Acceptance Criteria

Build + biome clean; 503 when R2 unconfigured; upload validates type/size and
returns an asset URL; backup writes an object; 401 gate; en/zh i18n.

## ActiveForm

Building R2 backup and OG image upload.

## Dependencies

- **blocked by**: (none — but DEPLOY needs `wrangler r2 bucket create sink`)
- **blocks**: (none)

## Notes

See PLAN-003 §P3b. **External**: R2 bucket must be provisioned for deploy.
**Security**: untrusted-file sink — validate type+size, randomize key,
site-token gate.
