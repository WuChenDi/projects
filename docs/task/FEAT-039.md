# FEAT-039 flnk — track-beacon guard + stored-dest logging + HMAC IP pepper (SEC-05/06)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (SEC-05, SEC-06)

## Background

- **SEC-05 `[MEDIUM]`** — (a) the public `api/launchpad/track` beacon accepted
  arbitrary `slug`/`blockId` with no auth/rate-limit/existence check → unlimited
  forged events + unbounded AE writes. (b) `[slug]/route.ts` passed the
  query-merged `dest` to `extractAccessLog`, so with `redirectWithQuery` on,
  visitor-controlled query landed in the owner's analytics `blob2` — log
  injection, storage inflation, possible >5KB AE blob → silent write failure.
- **SEC-06 `[MEDIUM]`** — `anonymizeIp` used `SHA-256(${ip}:${YYYY-MM-DD})[:32]`;
  the only salt was the public current date, so the ~4.3B IPv4 space was trivially
  brute-forced → raw IP recoverable (re-identifiable PII).

## What changed

- Rate-limit `track` by IP and reject slugs that don't resolve to a published
  launchpad.
- Log `link.url` (stored destination), not the query-merged `dest`; keep `dest`
  only for the `Location` header.
- Keyed HMAC-SHA-256 over `${ip}:${day}` with a secret pepper (`ANALYTICS_IP_SALT`
  env secret); daily rotation kept, key stays secret.

## Acceptance

- Forged/unresolvable track beacons rejected + rate-limited; analytics `blob2`
  carries only the stored destination; IP hashes are HMAC-keyed.
- `tsc` + `biome` green.
