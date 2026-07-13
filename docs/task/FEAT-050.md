# FEAT-050 flnk — group src/lib into domain folders (ARC-04)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (ARC-04)

## Background

`[MEDIUM]` `src/lib` was a flat directory of 26 files with no domain grouping,
making ownership and the resolve/analytics/data boundaries hard to see.

## What changed

- Grouped `src/lib` into domain folders `{redirect,analytics,data,ai,platform,
  format}/` (mechanical moves + import fixes), combined with the ARC-02 split.
  E.g. `csv.ts`/`format.ts` → `format/`; `api.ts`/`auth.ts`/`env.ts`/`logger.ts`/
  `rate-limit.ts` → `platform/`; `countries.ts`/`html.ts`/`redirect.ts`/`slug.ts`/
  `gate-token.ts` → `redirect/`.

## Acceptance

- All `src/lib` files live under a domain folder; imports updated; build green.
- `tsc` + `biome` green.
