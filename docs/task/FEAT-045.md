# FEAT-045 flnk — withAuth route wrapper + server error envelope (ARC-03)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (ARC-03)

## Background

`[MEDIUM]` ~35 routes duplicated the same `requireSession` gate + `safeParse` 400
block + `request.json().catch` boilerplate; only 7/38 had try/catch; there was no
uniform server error envelope (`ApiError` existed client-side only).

## What changed

- A `withAuth(schema, handler)` wrapper doing session-gate + zod-parse +
  typed-error→envelope + top-level catch/log (`src/lib/platform/with-auth.ts`).
- Routes migrated onto the wrapper, emitting a consistent server error envelope.

## Acceptance

- Wrapped routes return the shared error envelope on auth/parse/throw; no
  behavioral regression on migrated handlers.
- `tsc` + `biome` green.
