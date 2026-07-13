# FEAT-041 flnk — streamed backup query + launchpad count(*) (QUA-03/04)

- **status**: done
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (QUA-03, QUA-04)

## Background

- **QUA-03 `[HIGH]`** — `src/lib/backup.ts` paged `listLinks` at 1000; each page
  ran a full-table `count(*)` and `attachTagNames`, yet the backup payload used
  neither. ~50k rows ≈ 50 selects + 50 counts + 50 tag queries daily, half pure
  waste, exceeding the free 50-subrequest cap.
- **QUA-04 `[HIGH cost]`** — `listLaunchpads` selected every matching row's id
  just to count via `.length` (`total: totalRow.length`), a full `rows_read`
  charge per list request.

## What changed

- Backup gets its own streamed loop: `select(needed cols).where(isDeleted=0)
  .orderBy(id).limit/offset` — no `count(*)`, no `attachTagNames`.
- `listLaunchpads` counts via `select({ value: sql\`count(*)\` })` and reads
  `[0].value`, matching the links repo.

## Acceptance

- Daily backup issues one select per page (no counts/tag queries); launchpad list
  no longer selects all rows to count.
- `tsc` + `biome` green.
