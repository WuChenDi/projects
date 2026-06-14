# Architecture

This monorepo's full architecture (apps, packages, runtime families, build
tools, conventions) is documented in the root [`CLAUDE.md`](../CLAUDE.md).
This file holds PMA-tracked, in-flight architectural notes only.

## In-flight

### shortener (FEAT-001 / PLAN-001)

Migrating from a Hono Cloudflare Worker to a Next.js (App Router +
`@opennextjs/cloudflare`) dashboard app modeled on Sink's feature set.

- **Storage**: D1/Drizzle source of truth + KV redirect cache (hybrid).
- **Auth**: site-token (pending confirmation).
- **Bindings**: D1, KV, Workers AI, Analytics Engine, (R2 in P3).
- **Stack reference**: `apps/wepush`. **Feature reference**: `tmp/Sink`.

Details and phasing in `docs/plan/PLAN-001.md`.
