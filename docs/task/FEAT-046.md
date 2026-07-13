# FEAT-046 flnk — env zod validation + typed fields + memoized getConfig (ARC-05)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (ARC-05)

## Background

`[MEDIUM]` `env.ts` `num`/`bool` silently coerced (a typo'd value fell back with
no warning); CF creds / DoH / emails were read through a `loose` cast (untyped,
not in `cf-typegen`); `getConfig` re-parsed env on every hot-path call; and the
three-tier env fallback was duplicated with `db.ts`.

## What changed

- Zod-validate the config once, logging on fallback.
- Type the previously-`loose` fields.
- Memoize `getConfig` so the hot path no longer re-parses env.
- Consolidate the raw-env resolution helper (shared with `db.ts`) into
  `src/lib/platform/env.ts`.

## Acceptance

- Invalid env values log a warning instead of silently coercing; `getConfig`
  parses once; no duplicated env-resolution logic.
- `tsc` + `biome` green.
