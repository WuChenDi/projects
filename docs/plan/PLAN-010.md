# PLAN-010 flnk — launchpads (marketing pages)

- **status**: done
- **createdAt**: 2026-06-29
- **tasks**: FEAT-023, FEAT-024, FEAT-025

## Goal

A hosted marketing / link-in-bio builder: launchpads managed in the dashboard
(`/dashboard/(app)/launchpads`) and published at `/m/<slug>`, with views +
engagement analytics. Delivered in three layers — data/API (FEAT-023), public
render + analytics (FEAT-024), editor UI (FEAT-025).

## Current State

- flnk is Next.js (App Router) on OpenNext/Cloudflare Workers, dual-driver DB via
  `@cdlab/db/web`, better-auth (Google/GitHub) — a **shared workspace** keyed
  by `createdBy` (email), not per-owner isolated.
- `app/[slug]/route.ts` is the single-segment redirect; `reserve-slug.ts` carves
  out app paths. Analytics Engine writes a positional blob record; R2 is wired
  (commented) for image assets.
- The dashboard uses an `(app)` route group + `components/dashboard/<feature>/`.

## Architecture Decision

- **Entity vs public view**: `launchpads` (management) ↔ `/m/<slug>` (public,
  two-segment route — no collision with `[slug]`; `m` reserved).
- **Block model**: `config.blocks: Block[]`, order = render order, each block
  `{ id, type, enabled }`. MVP types: header, socials, button, shortlink, image,
  text, divider. Per-block scheduling is explicitly out.
- **Short-link blocks store link references (ids)**, not copied URLs — clicks go
  through `/<slug>`, reusing the short link's editable destination + click stats;
  the launchpad layers a `launchpad_block` engagement on top.
- **Multi-tenancy baseline (deferred isolation)**: every launchpad row is stamped
  with `ownerId` from the session **but not filtered** (shared workspace
  preserved). All owner filtering is funneled through one `scopeToOwner(query,
  session)` helper that is a no-op today and becomes the isolation switch later —
  no schema backfill needed when it flips. Dictionary-style child data (if any)
  uses `(name, ownerId)` uniqueness from the start.
- **Analytics**: reuse Analytics Engine. Add `type` as **blob19** (entity kind:
  `launchpad` view, `launchpad_block` engagement; append-only, legacy points lack
  it). New read helpers compute per-launchpad views + engagements.
- **Live preview / thumbnails**: a scaled live render of the public renderer (no
  screenshot/snapshot pipeline) — simplest, always current.
- **Visual design** is authored fresh for flnk's shadcn/Tailwind dashboard; Bitly
  is a structural reference only.

## Work Items

1. **FEAT-023 data + API** — `launchpads` table (`drizzle-kit generate`),
   `lib/launchpads.ts` repo (CRUD, slug uniqueness, ownerId stamp, `scopeToOwner`
   no-op), `schemas/launchpad.ts`, `app/api/launchpad/*`, reserve `m`.
   -> verify: CRUD round-trip incl. blocks; slug unique; ownerId stamped; `m`
   reserved; migration clean.
2. **FEAT-024 public render + analytics** — `app/m/[slug]/page.tsx` + block/theme
   renderer; draft/expired/deleted → not-found; `type` blob19 + view/engagement
   emit; `analytics-query.ts` views/engagements.
   -> verify: published renders, draft 404s, disabled blocks hidden; view +
   engagement recorded; short-link block still redirects via `/<slug>`.
3. **FEAT-025 editor** — list (search + cards: live preview, `/m/<slug>`,
   timestamps, views/engagements); editor Build/Design/Track + right-side mobile
   live preview + Publish; i18n keys.
   -> verify: all MVP blocks add/reorder/edit/enable-disable; theme applies;
   track shows per-launchpad + per-block metrics; draft/publish end-to-end.

## Risks

- **Reserved namespace**: confirm `app/m/[slug]` (two segments) never reaches the
  `[slug]` catch-all and that `m` reservation blocks a conflicting short link.
- **Analytics blob append (blob19)**: shared with PLAN-009's blob18 — land the AE
  schema additions coherently and verify legacy-point tolerance once.
- **OpenNext SSR for `/m/<slug>`**: ensure the public route renders without
  pulling client-only editor code; keep the renderer isomorphic.
- **Engagement double-counting**: a short-link block click is both a short-link
  click and a launchpad engagement by design — document so stats reconcile rather
  than look inflated.

## Out of Scope

- Custom domains (deferred this cycle); per-block scheduling; social/video/
  countdown/form/HTML-embed blocks; custom fonts/backgrounds; snapshot
  thumbnails; per-owner isolation enforcement (stamp now, enforce later).
