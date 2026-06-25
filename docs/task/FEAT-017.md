# FEAT-017 Sink P5e — enable/disable (pause) toggle

- **status**: completed
- **priority**: P3
- **owner**: (unassigned)
- **createdAt**: 2026-06-25 06:50

## Description

Let an operator temporarily pause a link without soft-deleting it.

- `database/schema.ts` `LinkConfig` + `schemas/link.ts` — add optional
  `disabled` boolean. No migration (config JSON).
- Redirect path (`app/[slug]/route.ts`) — when `config.disabled`, serve the
  not-found path (404 / `NOT_FOUND_REDIRECT`).
- List (`links-view.tsx`) — per-row enable/disable toggle (via
  `PUT /api/link/edit`) + a muted "disabled" visual state.

## Acceptance Criteria

Toggling disable makes the link 404 (or `NOT_FOUND_REDIRECT`); re-enabling
restores it; the list reflects disabled state; build + biome clean; en/zh i18n
(`links.disable`, `links.enable`, `links.disabled`).

## ActiveForm

Adding an enable/disable toggle for links.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

See PLAN-006 §FEAT-017. Config-flag (no migration), consistent with existing
cloaking/unsafe flags.
