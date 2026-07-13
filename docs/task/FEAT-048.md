# FEAT-048 flnk — strip sink/shortener legacy references (ARC-07)

- **status**: done
- **priority**: P3
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (ARC-07)

## Background

`[COSMETIC]` Leftover `sink`/`shortener` references: comments in `slug.ts:5`,
`links.ts:636`, `api/location/route.ts`, `page.tsx`; plus a functional leftover —
`ai-slug.ts:26-27` few-shot still primed
`https://shortener.cdlab.workers.dev` → `"shortener"`, biasing generated slugs.

## What changed

- Cleanup pass removing the stale `sink`/`shortener` comments.
- Replaced the stale few-shot example in `ai-slug.ts` so generation is no longer
  biased toward `"shortener"`.

## Acceptance

- No `sink`/`shortener` legacy references remain; AI slug few-shot uses a neutral
  example.
- `tsc` + `biome` green.
