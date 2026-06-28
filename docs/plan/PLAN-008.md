# PLAN-008 flnk — tags as a dictionary table + inline tag-ID column

- **status**: done
- **createdAt**: 2026-06-28
- **tasks**: FEAT-020

## Goal

Make a future tag rename a one-row update while keeping every current tag
behavior and the `LinkRow.tags: string[]` (names) API shape identical (frontend
untouched).

## Architecture Decision

Two earlier positions were tried and rejected:

- PLAN-007: tags as an inline JSON array of **names** → rename rewrites every link.
- First cut of PLAN-008: full `tags` + `link_tags` normalization → unnecessary
  join-table indirection for this scale, and the per-link `json_group_array`
  aggregate broke tag display (correlated-subquery column-qualification bug).

Final (user-directed) middle ground: a `tags` **dictionary** table is the single
source of truth for tag identity, and `links.tags` stores an inline JSON array of
**tag IDs**. Renaming updates one `tags` row; links reference by ID and resolve
the new name on read. No join table, no per-link rewrite.

- `tags`: `id` pk, `name` unique, tracking fields.
- `links.tags`: inline JSON `string[]` of tag IDs, `notNull default []`.
- No `link_tags`.

## Work Items

1. `database/schema.ts` — keep `tags`; add inline `links.tags` (`string[]` IDs);
   drop `linkTags` table + `LinkTag` type. `Link = LinkRow`. Run `pnpm db:gen`.
   -> verify: single baseline migration; `db:migrate` applies clean. ✓
2. `lib/links.ts` helpers — `upsertTagIds(names): Map<name,id>`,
   `tagNamesToIds(names): id[]` (ordered, creates missing), `attachTagNames(rows)`
   (one dictionary lookup resolves IDs → names).
   -> verify: existing name reuses id; missing name created; rows resolve. ✓
3. Reads — `listLinks`, `getLinkById`, `searchLinks` select the row then
   `attachTagNames`; `LinkRow.tags` stays names.
   -> verify: list shape identical to before. ✓
4. `listConditions` — AND/OR via `EXISTS (json_each(links.tags) ⨝ tags … name=?)`;
   untagged via `json_array_length(links.tags)=0`.
   -> verify: AND vs OR vs untagged result sets correct. ✓
5. `listTags` — per-tag count = non-deleted links whose `tags` contains the id.
   -> verify: counts correct on seeded data. ✓
6. `searchLinks` — tag text match via `json_each` join to `tags` on `name like`.
   -> verify: search by tag text returns the link. ✓
7. Writes — `bulkTagLinks`, `setLinkTags`, `createLink`, `updateLink`,
   `importLinks`: name→ID upsert, write inline `tags` IDs, purge KV cache.
   -> verify: only intended tags change; per-link dedup preserved. ✓
8. `resolveLink` — leave tags unresolved (redirect unused).
   -> verify: redirect + KV cache still work. ✓
9. Rename ergonomics — update one `tags` row; links display the new name with no
   per-link write.
   -> verify: raw column keeps IDs, resolved display shows new name. ✓

## Risks

- `json_each` / `json_array_length` on D1 + LibSQL — both ship SQLite JSON1;
  confirmed in dev.
- WHERE-context column qualification: the read aggregate that bit us lived in a
  SELECT projection (drizzle drops the table prefix there); all tag predicates
  now live in WHERE/`EXISTS`, where drizzle qualifies correctly. Verified.

## Out of Scope

Tag rename / merge / delete UI + endpoints (next task), colors / ordering / config.
