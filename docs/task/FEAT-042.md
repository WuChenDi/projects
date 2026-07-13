# FEAT-042 flnk — import/redirect/launchpad URL+scheme validation (SEC-07/08/12)

- **status**: done
- **priority**: P2
- **owner**: cd
- **createdAt**: 2026-07-13
- **audit**: docs/audit/2026-07-13-flnk-audit.md (SEC-07, SEC-08, SEC-12)

## Background

- **SEC-07 `[MEDIUM]`** — `ImportConfigSchema` typed `geo` as
  `record(string,string)` and `apple`/`google` as bare `string` (no URL/scheme/
  length check) and accepted `passwordHash` verbatim, unlike
  `LinkConfigInputSchema` (`z.url()`); imported values later became redirect
  `Location`.
- **SEC-08 `[LOW/MED]`** — `[slug]/route.ts` set `location: dest` directly; only
  the HTML preview paths sanitized via `safeExternalUrl`, so geo/apple/google
  overrides bypassing create-time validation were the risk.
- **SEC-12 `[LOW]`** — launchpad `profile.avatar` and `og.image` were only
  `z.string().max(2048)` while block `href`/`src` used `httpUrl`, defeating the
  stated anti-stored-XSS policy.

## What changed

- Reuse the `httpUrl` / `z.url().max(2048)` validators for `geo` values, `apple`,
  `google` (and bound `image`) in `ImportConfigSchema`.
- Guard before the redirect: reject `dest` whose `new URL(dest).protocol` is not
  `http:`/`https:` → `notFound`.
- Apply the same http(s) refinement to `profile.avatar` and `og.image` (allowing
  the `/api/asset/…` relative prefix).

## Acceptance

- Non-http(s) imported/override destinations rejected at parse and at the
  redirect; launchpad avatar/og.image scheme-validated.
- `tsc` + `biome` green.
