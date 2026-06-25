# FEAT-016 Sink P5d — click-limit expiration (maxVisits)

- **status**: done
- **priority**: P3
- **owner**: cd
- **createdAt**: 2026-06-25 06:50

## Description

Expire a link after N visits, alongside the existing time-based `expiresAt`.

- `database/schema.ts` `LinkConfig` + `schemas/link.ts` `LinkConfigInputSchema`
  — add optional `maxVisits` (positive int). No migration (config JSON).
- Redirect path (`app/[slug]/route.ts` / `lib/links.ts`) — increment a KV
  counter `visits:{id}` inside the existing `ctx.waitUntil` flow and, when
  `count >= maxVisits`, treat the link as expired (purge KV + serve notFound)
  before redirecting.
- Editor — a "max visits" number field beside the expiry picker.

## Acceptance Criteria

A link with `maxVisits = N` stops redirecting after ~N hits and serves the
not-found path; no extra round-trip on the cache-hit path beyond the counter;
build + biome clean; en/zh i18n (`links.form.maxVisits`).

## ActiveForm

Adding click-limit expiration.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-006 §FEAT-016. KV is eventually consistent → limit is approximate
(documented tradeoff). D1-column counter rejected (hot-path write cost).

## Implementation

- `database/schema.ts` — `LinkConfig.maxVisits?: number` (config JSON, no migration).
- `schemas/link.ts` — `maxVisits` (positive int) on `LinkConfigInputSchema` and
  `ImportConfigSchema`.
- `lib/links.ts` — `visitLimitReached(env, link, ctx)`: no-op unless `maxVisits`;
  reads KV `visits:{id}`, returns true at the cap (deletes counter in `waitUntil`),
  else increments in `waitUntil`. One KV read on the hot path.
- `app/[slug]/route.ts` — gate inside `redirectTo` (now async, with `afterGate`):
  at the cap → `purgeLink` + `notFound` before redirecting; counts only real
  redirects.
- Editor — "Max visits" number field beside the expiry picker.
- i18n — `links.form.maxVisits` / `maxVisitsPlaceholder` (en/zh).
- Verified: `pnpm --filter @cdlab996/sink build` (exit 0) + biome clean.
