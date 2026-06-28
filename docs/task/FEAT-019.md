# FEAT-019 flnk — make tags functional (server-side filter, multi-tag, batch, overview)

- **status**: done
- **priority**: P1
- **owner**: (unassigned)
- **createdAt**: 2026-06-27

## Description

FEAT-015 shipped tags as storage + chip editor + client-side single-tag filter.
Tags currently have no real effect: filtering only touches the loaded page,
search ignores tags, and there is no global tag view or batch tagging. Make tags
actually useful, **without** introducing a separate tag table or any tag-rename /
merge / delete tooling.

### P0 — fix the broken filter (correctness bugs)

- Server-side tag filter: add `tags` to `ListOptions` / list API; filter in the
  DB via SQLite `json_each` (mirrors the existing `json_extract` config filter in
  `listConditions`). Total count must reflect the tag filter.
- Wire `tagFilter` into the React Query `queryKey` and reset page to 0 on change
  (currently missing — tag filter does not survive pagination).
- Search covers tags: `searchLinks` matches tags in addition to slug/url/comment.

### P1 — usable

- Multi-tag filter with AND (default) / OR toggle.
- "Untagged" filter option (empty `tags` array).
- Tag autocomplete in the editor chip input, suggesting from existing tags as a
  typing convenience. No case normalization — store input verbatim; `Blog` and
  `blog` remain distinct tags. (Existing trim + dedup-per-link stays.)
- Batch add / remove a tag across multi-selected links (row checkboxes ->
  batch action).
- Global tag overview: distinct tags + per-tag counts (mirror `listCreators`
  using `json_each`); clicking a count filters by that tag.

## Acceptance Criteria

- Filtering by a tag returns correct results and total across a multi-page
  dataset; switching tags resets to page 1.
- Search input matches links by tag.
- Multi-tag AND/OR behaves as specified; "untagged" returns only empty-tag links.
- Editor suggests existing tags (verbatim, no case folding); duplicate tags on
  one link still rejected.
- Batch add/remove updates the selected links only and preserves their other
  tags.
- Tag overview counts match the filtered result counts.
- No new migration (tags column already exists); build + biome clean; en/zh i18n.

## Out of Scope

- Rename / merge / delete tag operations.
- Separate `tags` table, tag colors / ordering, tag-level default config,
  tag-level analytics.

## ActiveForm

Making link tags functional.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Addendum (2026-06-28) — tag UX revision

Tags are a **shared pool**; editing must be possible from the list too, not only
the editor.

- Editor: replace the Enter-to-add chip input with a **multi-select combobox**
  (`@cdlab996/ui` base-ui `combobox`, chips + dropdown of the shared tag pool,
  creatable by typing).
- List rows: inline **"+ Add tag"** popover (search + checkbox list of the shared
  pool, creatable) toggling tags on that single link via the existing
  `/api/link/tag-bulk` (`ids:[id]`). Row chips keep their click-to-filter role.

## Notes

See PLAN-007. Builds on FEAT-015.
