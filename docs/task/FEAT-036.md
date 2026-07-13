# FEAT-036 flnk — cleanup batching + LIMIT page + visits purge (QUA-02/07/08)

- **status**: done
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (QUA-02, QUA-07, QUA-08)

## Background

The daily cleanup cron (`src/lib/cleanup.ts`) had three defects:

- **QUA-02 `[HIGH]`** — serial `await KV.delete` per expired row (one subrequest
  each); >~1000 in a window blew the subrequest cap or timed out mid-purge,
  leaving D1 soft-deleted but KV still serving stale positive copies.
- **QUA-07 `[MEDIUM]`** — unbounded `UPDATE … RETURNING` (no LIMIT) materialized
  every expired row into Worker memory.
- **QUA-08 `[LOW]`** — purged `link:{domain}:{slug}` but never the
  `visits:{id}` counter (written with no TTL) → permanent KV storage leak.

## What changed

- Select a bounded page of expiring ids first (`LIMIT`), soft-delete + purge just
  that page, and let the daily cadence drain the rest.
- Bounded-concurrency KV deletes in chunks (~10–20) instead of a serial loop.
- Purge loop also deletes `visits:${link.id}` (id already in `.returning()`).

## Acceptance

- Cleanup runs within the subrequest/wall-time budget; no stale positive KV
  entries after a purge; `visits:` keys removed alongside `link:` keys.
- `tsc` + `biome` green.
