# FEAT-035 flnk — links expiresAt/createdAt indexes + migration 0003 (QUA-01)

- **status**: done
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (QUA-01)

## Background

`[HIGH]` `src/database/schema.ts` only had `uniq_links_slug_domain`. The daily
cron `WHERE is_deleted=0 AND expires_at<now`, the dashboard expired/active
filters, and `ORDER BY created_at` were all full-table scans, so D1 `rows_read`
(and therefore cost) grew linearly with total rows every day.

## What changed

- Added `idx_links_expires_at` and `idx_links_created_at` to the Drizzle `links`
  schema.
- New Drizzle migration `0003` under `src/database` creating the two indexes.

## Acceptance

- `db:gen` produced migration 0003; indexes present in the generated SQL.
- `tsc` + `biome` green.
