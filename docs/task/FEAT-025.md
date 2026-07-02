# FEAT-025 flnk — launchpads: dashboard editor (Build / Design / Track)

- **status**: review
- **priority**: P1
- **owner**: bkd:claude-code
- **createdAt**: 2026-06-29

## Description

The management UI for launchpads under `/dashboard/(app)/launchpads`. Depends on
FEAT-023 (API) and FEAT-024 (public render reused for the live preview + metrics).
Visual design is built fresh to fit flnk's existing shadcn/Tailwind dashboard
language — the Bitly editor is a structural reference only, not a visual one.

## List page

`/dashboard/(app)/launchpads` — search box + a card per launchpad showing:
live mini-preview (scaled render — no snapshot pipeline), `/m/<slug>` URL,
created/updated, and headline **views** + **engagements**. New / edit / delete.

## Editor

Three tabs + a right-side mobile live preview (scaled reuse of the FEAT-024
renderer) + a `Publish` action (draft edits apply on publish):

- **Build** — add / reorder (drag) / edit / enable-disable blocks. MVP block set:
  header (avatar + name + bio) → socials → button / short-link → image → text →
  divider. Short-link blocks pick from existing links (stored as references).
- **Design** — preset theme + primary color + button shape (MVP scope; fonts /
  background images are out).
- **Track** — per-launchpad views + engagements + per-block breakdown, from the
  FEAT-024 metrics.

## Work

- `app/dashboard/(app)/launchpads/` — list + editor pages.
- `components/dashboard/launchpads/` — list cards, block editor, design panel,
  track panel, live-preview wrapper (reuses the FEAT-024 block renderer).
- i18n keys in `messages/{en,zh}.json`.

## Acceptance Criteria

- List shows cards with live preview + views/engagements + search.
- Build: add/reorder/edit/enable-disable all MVP block types; short-link blocks
  reference existing links; live preview updates as edited.
- Design: theme preset + primary color + button shape apply to preview + public.
- Track: per-launchpad + per-block metrics render.
- Draft vs publish respected end-to-end.
- `tsc` + biome clean; both locales have keys.

## Out of Scope

- Per-block scheduling; social/video/countdown/form/HTML-embed blocks; custom
  fonts/backgrounds; snapshot thumbnails.

## Dependencies

- **blocked by**: FEAT-023, FEAT-024
- **blocks**: (none)

See PLAN-010.

## Follow-up scope

- **List ⇄ grid view toggle** (post-implementation request): the launchpads list
  now offers the same list/grid view toggle as the Links page. Added
  `src/stores/launchpads-view-store.ts` (persisted `view`, default `grid`,
  mirroring `links-filter-store`'s `partialize`), a `ToggleGroup` (List /
  LayoutGrid icons) in `launchpads-view.tsx`, and a compact horizontal list-row
  layout alongside the existing card grid (shared row pieces kept in sync).
  New i18n keys `launchpads.viewList` / `launchpads.viewGrid` in en + zh.
