# FEAT-037 flnk — cron order (backup before cleanup) + per-task try/catch (QUA-05)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (QUA-05)

## Background

`[MEDIUM]` `src/worker/index.ts` ran `backupToR2` **after** `cleanupExpiredLinks`.
Since backup filters `is_deleted=0`, links expiring today were removed from the
live view before the day's snapshot → never backed up → silent restore loss.
Additionally, `cleanupExpiredLinks` swallowed its errors but `backupToR2` did not,
so a D1/R2 error threw out of `scheduled()` and failed the whole cron.

## What changed

- Run backup **before** cleanup so the day's snapshot includes soon-to-expire rows.
- Wrap each cron task (backup, cleanup) in its own try/catch with logging so one
  failure no longer aborts the other.

## Acceptance

- Expiring-today rows appear in the day's backup; a failure in one task is logged
  and does not fail the whole `scheduled()` run.
- `tsc` + `biome` green.
