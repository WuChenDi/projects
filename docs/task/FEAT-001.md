# FEAT-001 Rebuild shortener as a Sink-like Next.js app

- **status**: in_progress
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-06-14 05:23

## Description

Migrate `apps/shortener` from a Hono Cloudflare Worker into a full-featured
Next.js application, matching the **wepush** tech stack (Next.js App Router +
`@opennextjs/cloudflare` + Drizzle + `@cdlab996/ui`) and the **feature set of
Sink** (the Nuxt URL shortener at `tmp/Sink`, used purely as a product/feature
reference — not a code reference).

Target product capabilities (from Sink):

- Admin dashboard: link list (search / sort / pagination / QR), link editor
  with advanced options (geo per-country target, apple/google device target,
  expiration, comment, OG title/description/image, password, unsafe warning,
  cloaking, UTM builder, redirect-with-query).
- Redirect engine: geo routing, device routing, password gate, unsafe warning,
  social-bot OG rendering, cloaking, access logging to Analytics Engine.
- Analytics pages: counters, views over time, metrics (locations / referers /
  slugs / devices / browsers / OS), heatmap, realtime (chart + logs; WebGL
  globe optional/deferred).
- AI slug generation (Workers AI).
- Health check, backup / import / export, image upload (R2) — later phases.
- Auth via a single site token.

## Acceptance Criteria

Defined per phase in PLAN-001. Each phase ships an independently verifiable
slice (build passes, lint passes, the phase's pages/endpoints function locally
via `nsl`).

## ActiveForm

Rebuilding shortener into a Sink-like Next.js dashboard app.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Storage decision settled: **D1/Drizzle as source of truth + KV as redirect
  cache** (hybrid), not Sink's pure-KV model. See PLAN-001 Context/Decisions.
- Reference apps: `apps/wepush` (stack), `tmp/Sink` (features).
- All open decisions resolved 2026-06-14 (see PLAN-001 Annotations): **new app
  `apps/sink`**, greenfield, site-token (env) auth, **multi-domain retained**
  (`(slug, domain)` composite key), P1 split into P1a/P1b/P1c, default 308,
  wepush frontend stack, genid, Sink AE layout, **i18n in P1**, globe/map/
  OpenAPI not built.
- One interpretation flagged for confirmation: multi-domain via composite
  `(slug, domain)` vs the original sha256 hash mechanism. → resolved: composite.
- **P1a done** (2026-06-14): `apps/sink` scaffold + redirect engine merged into
  `feat/sink-app` (BKD `hd2zbarw` → done; coordinator /pma-cr fixes in 7a846d9).
  P1b (`u3wuz8f7`) / P1c (`l0huhojt`) remain — dispatch blocked by the BKD
  base-branch constraint (see PLAN-001); decide in-session vs land-on-main.
