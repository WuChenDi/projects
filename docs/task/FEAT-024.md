# FEAT-024 flnk — launchpads: public /m/<slug> render + analytics

- **status**: completed
- **priority**: P1
- **owner**: bkd:claude-code
- **createdAt**: 2026-06-29

## Description

Render a published launchpad at `/m/<slug>` (SSR) and record its analytics
(**views** + **engagements**). Depends on FEAT-023.

## Render

- New route `app/m/[slug]/page.tsx` (SSR, OpenNext). Resolves the launchpad by
  slug; serves not-found when missing, `draft`, soft-deleted, or expired.
- Renders the block list in order, skipping `enabled === false` blocks, applying
  the theme (preset + primaryColor + buttonShape).
- Page-level OG/meta from `launchpad.og`.
- `/m/` is a two-segment route, so it does not collide with the single-segment
  `[slug]` redirect; `m` is also reserved (FEAT-023).

## Analytics (reuse Analytics Engine)

- **view**: one data point per `/m/<slug>` load — `type=launchpad` (the new
  blob19 entity dimension), `slug` = launchpad slug.
- **engagement**: a block/button click — `type=launchpad_block`, carrying the
  block id (reuse an existing blob, e.g. `url`, to hold `blockId`).
- `shortlink` / `button`-to-short-link clicks route through `/<slug>`, so the
  short-link click is already tracked there; the launchpad additionally records
  an engagement so the two views reconcile.
- Add `type` as **blob19** in `writeAccessLog` (append-only). New read helpers in
  `analytics-query.ts` for per-launchpad `views` + `engagements` totals.

## Work

- `app/m/[slug]/page.tsx` + a server renderer for blocks/theme.
- `lib/analytics.ts` — `type` (blob19) + launchpad view/engagement emit path
  (an `/api/launchpad/track` endpoint or edge handler for click beacons).
- `lib/analytics-query.ts` — `type: 'blob19'` + views/engagements queries.

## Acceptance Criteria

- Published launchpad renders at `/m/<slug>`; draft/expired/deleted → not-found.
- Disabled blocks are hidden; theme applied.
- A page load records a `launchpad` view; a block click records a
  `launchpad_block` engagement; a short-link block click also redirects via
  `/<slug>`.
- `views` + `engagements` totals queryable per launchpad.
- `tsc` + biome clean.

## Out of Scope

- Editor UI (FEAT-025); per-block scheduling; dwell-time analytics.

## Dependencies

- **blocked by**: FEAT-023
- **blocks**: FEAT-025 (consumes the same render + metrics)

See PLAN-010.
