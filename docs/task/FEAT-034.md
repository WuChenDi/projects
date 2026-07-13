# FEAT-034 flnk — redirect rate-limit + cache-penetration guard (SEC-03)

- **status**: done
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (SEC-03)

## Background

`[HIGH]` The redirect hot path (`src/app/[slug]/route.ts`) had no general per-IP
rate limit — only the password-attempt limiter. A stream of fresh random
valid-looking slugs always missed `readCache`, hit D1 in `resolveLink`, and wrote
a throwaway negative-cache tombstone per request → 1 D1 read + 1 KV write each,
exhausting D1/KV quota. Malformed slugs still hit D1 as pure wasted reads.

## What changed

- `resolveLink` short-circuits `validateSlug(slug) === null` → returns `null`
  before any D1 query (a slug that fails validation can never exist), killing the
  malformed-slug penetration class.
- Per-IP resolve limiter using the Cloudflare native Rate Limiting binding
  (`ratelimits`, per-colo in-memory, no D1/KV cost), checked in `route.ts`
  GET/POST before `resolveLink`; 429 on exceed. Fail-open when the binding is
  absent (dev) or IP is `unknown`. Threshold configurable via `env.ts`
  (default ~100 req / 60s).

## Acceptance

- bench `cold` at high concurrency stops hitting D1/KV past the threshold;
  malformed slugs never issue a D1 query.
- `tsc` + `biome` green.
