# FEAT-040 flnk — check batch caps + id-chunk-99 + SSRF blocklist (QUA-06/09, SEC-11)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (QUA-06, QUA-09, SEC-11)

## Background

- **QUA-06 `[MEDIUM]`** — `getLinkRowsByIds` / `getLinksByIds` added
  `eq(isDeleted,0)` on top of a 100-element `inArray` → 101 bound params, and
  `api/link/check` passed exactly `max(100)` ids straight through → "too many SQL
  variables".
- **QUA-09 `[LOW]`** — a 100-URL health-check batch issued ~200 outbound
  subrequests (reachability + DoH) + up to ~100s wall time, exceeding the free
  50-subrequest cap.
- **SEC-11 `[LOW]`** — `isBlockedHostname` missed CGNAT `100.64.0.0/10`,
  IPv4-mapped IPv6 (`::ffff:169.254.169.254`), and non-dotted-decimal encodings
  (octal `0177.0.0.1`, integer `2130706433`); local dev/preview was unprotected.

## What changed

- Chunk id lists at 99 (leave room for the `isDeleted` constant) inside the
  helpers.
- Lower the check route batch cap / DoH fan-out so the worst case stays under the
  plan subrequest cap.
- Normalize the host / parse the resolved IP form before the literal checks; add
  `100.64/10` and IPv4-mapped-IPv6 ranges to the blocklist.

## Acceptance

- 100-id check no longer errors; check batch stays under the subrequest cap;
  blocklist rejects the added encodings/ranges (covered by unit tests).
- `tsc` + `biome` + vitest green.
