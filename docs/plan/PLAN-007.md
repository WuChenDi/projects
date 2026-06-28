# PLAN-007 flnk — make tags functional

- **status**: done
- **createdAt**: 2026-06-27
- **tasks**: FEAT-019

## Goal

Turn flnk tags from inert labels into a working organization feature: correct
server-side filtering, multi-tag logic, search coverage, batch tagging, and a
global tag overview. No tag table, no rename/merge/delete.

## Architecture Decision

Keep `links.tags` as the JSON `string[]` column (FEAT-015). Filter and aggregate
server-side with SQLite `json_each(links.tags)`, consistent with the existing
`json_extract` config filter in `listConditions`. This avoids a schema migration
and a relational tag model that the chosen scope does not require.

## Work Items

### P0 — correctness

1. `lib/links.ts` — extend `ListOptions` with `tags: string[]` + `tagMatch:
   'and' | 'or'`; in `listConditions`, push an `EXISTS(SELECT 1 FROM
   json_each(links.tags) WHERE value IN (...))` per-tag (AND) or single IN (OR).
   -> verify: filtered list + total correct across pages.
2. `app/api/link/list/route.ts` — parse repeated `tag` params + `tagMatch`.
   `lib/api.ts` `ListParams` + `list()` serialize them.
   -> verify: querystring round-trips; server filters.
3. `links-view.tsx` — add `tagFilter` (and match mode) to the React Query
   `queryKey`; add to the page-reset `useEffect`.
   -> verify: change tag on page 3 -> back to page 1, refetch.
4. `searchLinks` — add tag match to the `or(...)` clause via `json_each`.
   -> verify: search by tag text returns the link.

### P1 — usable

5. Multi-select tag filter UI + AND/OR toggle in the filter bar.
   -> verify: AND vs OR result sets differ as specified.
6. "Untagged" pseudo-filter (`json_array_length(tags) = 0`).
   -> verify: returns only empty-tag links.
7. Editor `TagsField` autocomplete from a distinct-tags source (typing
   convenience only; no case folding, store verbatim).
   -> verify: typing suggests existing tags; dup-on-link rejected.
8. Batch add/remove tag over checkbox-selected rows (new endpoint or extend an
   existing batch route) — read-modify-write each row's `tags`.
   -> verify: only selected rows change; other tags preserved.
9. `listTags(env)` (mirror `listCreators`) -> distinct tags + counts; surface in
   the filter bar.
   -> verify: counts equal filtered totals.

## Risks

- `json_each` / `json_array_length` availability on D1 + LibSQL — both ship
  SQLite JSON1; confirm in dev against the wepush/flnk libsql driver.
- Batch tag write is read-modify-write on JSON; do it in one transaction/batch to
  avoid partial updates.

## Out of Scope

Rename/merge/delete tags, tag table, colors/ordering, tag-level config/analytics.
