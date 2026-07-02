# FEAT-022 flnk — QR code styling + scan-source tracking

- **status**: completed
- **priority**: P2
- **owner**: bkd:claude-code
- **createdAt**: 2026-06-29

## Description

Expose a QR code as a **capability of each short link** (not a separate entity —
a QR is just a styled rendering of the link's public URL). Two parts:

1. **Custom styling** — per-link QR style (foreground/background color, logo,
   dot/corner style, error-correction level, margin), persisted so it is editable
   and reproducible.
2. **Scan tracking** — make a scan distinguishable from a normal click. The QR
   encodes the link URL with a marker (`/<slug>?qr=1`); the redirect engine reads
   it, records `source=qr` (vs `source=link`) in Analytics Engine, and strips the
   marker from any forwarded query string.

A QR always wraps an existing managed short link, so the link list IS the QR list
(a per-row action / panel), with no parallel table.

## Schema (no new table)

- `LinkConfig.qr?`: `{ fgColor, bgColor, logo?, dotStyle?, cornerStyle?,
  errorLevel?, margin? }` stored inside the existing `links.config` JSON.
- `logo` is either an R2 asset key (when R2 enabled → upload) or an image URL
  (when R2 disabled → paste URL); gated by the existing `/api/config` R2 flag,
  reusing `/api/upload/image` + `/api/asset/[...key]`.

## Analytics

- Add `source` as **blob18** in `writeAccessLog` (`extractAccessLog` derives it
  from the `qr` query param). Append-only — existing data points have no blob18.
- Add `source` to `analytics-query.ts` FIELD map so metrics can break down
  scans vs clicks. `metricsByDimension` already filters `!= ''`, so legacy rows
  are naturally excluded.

## Work

- `database/schema.ts` (`LinkConfig` interface) + `schemas/link.ts`
  (`LinkConfigInputSchema.qr`) — add the qr style shape.
- `lib/analytics.ts` — derive + write `source` (blob18); `redirect.ts` /
  `resolveDestination` — strip `qr` from the forwarded query.
- `lib/analytics-query.ts` — `source: 'blob18'`.
- Frontend — QR render + download (PNG/SVG) via `qr-code-styling`; style panel in
  the link editor; logo upload/URL dual mode per R2 flag.

## Acceptance Criteria

- QR renders from a link's `/<slug>?qr=1` URL with the saved style; PNG + SVG
  download work.
- Logo: upload mode when R2 on, URL mode when R2 off (verified both).
- A scan (with `?qr=1`) logs `source=qr`; a normal click logs `source=link`; the
  forwarded destination query no longer contains `qr`.
- Metrics endpoint can group by `source`.
- `tsc` + biome clean.

## Out of Scope

- QR style templates / reuse across links; bulk QR export; dynamic QR re-point
  beyond the existing editable destination.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)
- **new dep**: `qr-code-styling` (verify latest stable at npm before adding).

See PLAN-009.
