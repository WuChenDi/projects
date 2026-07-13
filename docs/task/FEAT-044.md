# FEAT-044 flnk — vitest harness + security unit tests (ARC-01)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (ARC-01)

## Background

`[HIGH impact]` flnk had no test harness — no vitest/jest, no `*.test.ts`, only
`scripts/bench.mjs`. The highest-value untested code is security-critical and
pure: `analytics-query.ts` `sanitize`, `health-check.ts` `isBlockedHostname`,
`gate-token.ts` verify (constant-time), `csv.ts` `escapeCsvCell`, `slug.ts`
`validateSlug`, `redirect.ts` `resolveDestination`, `env.ts` `num`/`bool`.

## What changed

- Added vitest (`vitest.config.ts`) to the app.
- Seeded unit tests for the security-critical pure functions, including
  `redirect/slug.test.ts` and `redirect/gate-token.test.ts` (the SSRF blocklist
  and gate-token tests land alongside FEAT-040 / FEAT-043).

## Acceptance

- `pnpm --filter @cdlab/flnk exec vitest run` green.
- `tsc` + `biome` green.
