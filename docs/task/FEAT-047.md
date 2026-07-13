# FEAT-047 flnk — dedup bots/RepoResult/SortKey + cache-keys registry (ARC-06)

- **status**: done
- **priority**: P3
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (ARC-06)

## Background

`[LOW-MED]` Duplication and scattered cache keys: two divergent bot lists
(`analytics.ts` `isBot` vs `redirect.ts` `isSocialCrawler`); `RepoResult` defined
twice (links/launchpads); `SortKey` defined 3× (api/links/launchpads);
response-error parsing duplicated 3× in `api.ts`; KV key schemes inlined in 3
files (`link:`, `visits:`, `pwfail:`).

## What changed

- Unified bot detection into `lib/bots.ts` — the merged list is a **union
  superset** of the two prior lists, so bot detection is now broader than either.
- Generic `RepoResult<T>`; hoisted single `SortKey`; shared `parseError` helper in
  `api.ts`.
- `lib/cache-keys.ts` registry for the `link:` / `visits:` / `pwfail:` schemes.

## Acceptance

- Single source for bots / RepoResult / SortKey / cache keys; broadened bot
  detection verified against both former lists.
- `tsc` + `biome` green.
