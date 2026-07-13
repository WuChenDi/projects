# FEAT-049 flnk — split links.ts into lib/data/links/{cache,resolve,repo,tags} (ARC-02)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (ARC-02)

## Background

`[HIGH]` `links.ts` was a 966-line god-module mixing KV cache, redirect-path
resolution, dashboard CRUD, and the tag subsystem — the single biggest blocker to
testing (ARC-01) and the route wrapper (ARC-03).

## What changed

- Split `links.ts` into `lib/data/links/{cache,resolve,repo,tags}.ts`, watching
  the resolve→cache→config import cycle.
- Public entry points preserved so callers/imports keep resolving.

## Acceptance

- Each module has a single responsibility; no import cycle; redirect + dashboard +
  tag paths unchanged.
- `tsc` + `biome` + vitest green.
