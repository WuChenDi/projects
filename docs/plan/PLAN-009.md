# PLAN-009 flnk — short-link title + QR styling & scan tracking

- **status**: draft
- **createdAt**: 2026-06-29
- **tasks**: FEAT-021, FEAT-022

## Goal

Two independent short-link enhancements that share the link editor + the
Analytics Engine schema:

1. A management **display title** on links (FEAT-021).
2. **QR code styling** + **scan-source** tracking, modeled as a capability of the
   existing link rather than a new entity (FEAT-022).

## Current State

- `links` has `slug`, `comment`, `config` (JSON `LinkConfig`), `tags`, etc.
  `config.title` is the OG title; there is no management display name.
- The redirect engine (`app/[slug]/route.ts` → `lib/redirect.ts`) already forwards
  the query string; `lib/analytics.ts` writes a fixed 17-blob Analytics Engine
  data point; `lib/analytics-query.ts` maps `blob1..blob17` to dimensions and
  filters `!= ''` when grouping.
- R2 is wired but commented; `/api/config` exposes the R2 flag and
  `/api/upload/image` + `/api/asset/[...key]` already exist (OG image upload).

## Architecture Decision

- **Title** is a new top-level `links.title` column, kept separate from `comment`
  (note) and `config.title` (OG) to avoid overloading either.
- **QR is not an entity.** A QR encodes the link's own public URL, so the link
  list IS the QR list. Style lives in `config.qr`; the image is rendered client
  side (`qr-code-styling`) and never stored (logo asset may live in R2).
- **Scan tracking** needs the QR URL to be distinguishable from a click. The QR
  encodes `/<slug>?qr=1`; the redirect derives `source` (`qr` | `link`), writes it
  as the new **blob18**, and strips `qr` from the forwarded destination query.
  Analytics Engine blobs are positional and append-only — legacy points simply
  lack blob18, and the `!= ''` grouping filter excludes them.

## Work Items

1. `database/schema.ts` — add `links.title` (`notNull default ''`) + `config.qr`
   shape on `LinkConfig`; `pnpm db:gen` → `db:migrate`.
   -> verify: single migration applies clean; existing rows default.
2. `schemas/link.ts` — top-level `title`; `LinkConfigInputSchema.qr` object.
   -> verify: create/edit accept both; reject malformed colors/levels.
3. `lib/links.ts` — thread `title` through create/update/import/export.
   -> verify: round-trip title; default `''`.
4. `lib/analytics.ts` — derive + write `source` as blob18 from the `qr` param.
   `lib/redirect.ts` — strip `qr` from the forwarded query.
   -> verify: `?qr=1` → source=qr, forwarded dest has no `qr`; plain → source=link.
5. `lib/analytics-query.ts` — `source: 'blob18'`; metrics can group by source.
   -> verify: metrics endpoint returns scan vs click split.
6. Frontend — link list shows title (fallback slug); editor Title field; QR style
   panel + PNG/SVG download (`qr-code-styling`); logo upload (R2 on) / URL (R2 off)
   via the `/api/config` flag.
   -> verify: QR renders with style; both logo modes; downloads valid.

## Risks

- Analytics Engine blob append: confirm reads tolerate missing blob18 on old
  points (grouping already filters empty — verify the counters/metrics paths).
- `qr-code-styling` bundle under OpenNext/edge — render client-side only; verify
  no SSR import. Verify latest stable at npm before adding.

## Out of Scope

- QR templates / bulk export; renaming existing fields; launchpads (PLAN-010).
