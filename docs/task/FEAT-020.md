# FEAT-020 flnk — tags as a dictionary table + inline tag-ID column

- **status**: done
- **priority**: P1
- **owner**: (unassigned)
- **createdAt**: 2026-06-28

## Description

FEAT-019 stored tags as a JSON `string[]` of **names** on `links`, so a future
tag **rename** would have to rewrite every link's JSON. The first attempt at a
fix fully normalized into `tags` + `link_tags` join tables, but that join-table
indirection was unnecessary for this app's scale and reintroduced a correlated
`json_group_array` subquery (which mis-resolved its `links.id` correlation and
broke tag display — the original report).

Final design (user-directed): keep a `tags` **dictionary** table as the single
source of truth for tag identity/name, but store the relationship **inline** on
`links` as a JSON array of **tag IDs** (not names). A rename is then a one-row
update to `tags`; links reference by ID and pick up the new name automatically,
with no fan-out rewrite and no join table.

This is **structure change with behavior parity** — filtering, search, tag
overview, batch tagging, and inline editing behave exactly as before, and the
`LinkRow.tags: string[]` (names) API shape is unchanged, so the frontend is
untouched.

### Schema

- `tags` table: `id` (pk), `name` (unique), `createdBy` (email of the user who
  first created the tag), + shared `trackingFields`. Single source of truth, kept
  extensible for future per-tag fields. `createdBy` is recorded on first insert
  only — re-using an existing tag never overwrites its original author; it threads
  from `auth.user.email` through every tag-writing path (create/edit/import/
  bulk/set).
- `links.tags`: inline `text('tags', { mode: 'json' }).$type<string[]>()` holding
  **tag IDs**, `notNull default []`.
- No `link_tags` join table.

### Behavior (re-pointed at inline IDs + the dictionary)

- Reads (`listLinks`, `getLinkById`, `searchLinks`) select the row, then
  `attachTagNames` resolves the ID array to names in one dictionary lookup per
  batch → `LinkRow.tags: string[]` (names) unchanged.
- `listConditions` tag filter: `EXISTS (json_each(links.tags) ⨝ tags … name = ?)`
  for AND/OR; untagged → `json_array_length(links.tags) = 0`.
- `listTags`: name + count where count is non-deleted links whose `tags` array
  contains the tag id (`json_each`).
- `searchLinks` tag match: `json_each` join to `tags` on `name like ?`.
- `bulkTagLinks` / `setLinkTags`: resolve name→ID (upsert), mutate the inline ID
  array, purge the link's KV redirect cache.
- `createLink` / `updateLink` / `importLinks`: upsert names → IDs, write the
  inline `tags` column. Returned link carries names.
- Redirect hot path (`resolveLink`) does not resolve names (unused there).

### Data migration

None required — the database was reset before applying. Migration is DDL only
(`drizzle-kit generate` → single baseline). For a populated DB, a backfill would
upsert names into `tags` and replace each link's `tags` JSON with the IDs.

## Acceptance Criteria

- Schema generated via `drizzle-kit generate`; applied locally (`db:migrate`). ✓
- All tag features behave identically (filter AND/OR/untagged, search, overview
  counts, batch add/remove, inline editor) — verified against seeded data. ✓
- `LinkRow.tags: string[]` (names) API shape unchanged; frontend code unchanged. ✓
- Rename a tag = one-row update to `tags`; links follow with no per-link write —
  verified (raw column keeps IDs, resolved display shows the new name). ✓
- `tsc` + biome clean. ✓

## Out of Scope

- Tag rename / merge / delete UI + endpoints (follow-up; this schema unblocks it).
- Tag colors / ordering / icons / per-tag config (separate request).

## ActiveForm

Tags stored as a dictionary table referenced by inline tag IDs on links.

## Dependencies

- **blocked by**: (none)
- **blocks**: (future tag rename/merge/delete task)

## Notes

Supersedes the `link_tags` join-table approach (also reversed PLAN-007's
"no tag table"). Final model is the middle ground: dictionary table + inline IDs.
See PLAN-008.
