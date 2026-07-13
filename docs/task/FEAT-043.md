# FEAT-043 flnk — dashboard allow-list parity + gate-token nonce/IP + key separation (SEC-09/10)

- **status**: done
- **priority**: P3
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (SEC-09, SEC-10)

## Background

- **SEC-09 `[LOW]`** — `src/app/dashboard/(app)/layout.tsx` checked only
  `getSession`, not `isEmailAllowed` (unlike `requireSession`). Moot while the demo
  is open, but cheap defense-in-depth.
- **SEC-10 `[LOW]`** — `gate-token.ts` HMAC covered only `slug:expiresAtMs`
  (no nonce/user/IP → replayable for the 5-min TTL) and was keyed by
  `BETTER_AUTH_SECRET` (no key separation). Constant-time compare was already
  correct.

## What changed

- Dashboard layout also runs `isEmailAllowed` after `getSession` (shared helper
  exported from `auth.ts`), else `redirect('/dashboard/login')`.
- Gate token binds to a per-attempt nonce / client IP and derives a dedicated key
  (labelled/HKDF) instead of using `BETTER_AUTH_SECRET` directly.

## Acceptance

- Dashboard re-checks the allow-list; gate tokens are no longer replayable across
  attempts and use a separated key (covered by `gate-token.test.ts`).
- `tsc` + `biome` + vitest green.
