import { hashPasswordFn } from '@cdlab996/utils'
import {
  and,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import type { Link, LinkConfig, LinkRow, NewLink } from '@/database/schema'
import { links, tags } from '@/database/schema'
import type { DB } from '@/lib/db'
import { getDb } from '@/lib/db'
import { getConfig } from '@/lib/env'
import { genid } from '@/lib/genid'
import { logger } from '@/lib/logger'
import { isUnsafeUrl } from '@/lib/safe-browsing'
import { randomSlug, validateSlug } from '@/lib/slug'
import type {
  CreateLinkInput,
  EditLinkInput,
  ImportLinkInput,
} from '@/schemas/link'

// Negative-cache sentinel stored under the link cache key when a slug resolves
// to nothing. A real link is always serialized JSON ('{'…), so this marker can
// never be mistaken for one. A later create/import writes the real link under
// the SAME key, overwriting the tombstone in place — no separate invalidation
// needed.
const NEGATIVE_CACHE = '__miss__'

// Max tags per link — mirrors the bound in `schemas/link.ts`.
const MAX_TAGS = 20

// Trim, drop empties, de-dupe, and cap a raw tag-name list.
function normalizeTagList(input?: string[]): string[] {
  return Array.from(
    new Set((input ?? []).map((t) => t.trim()).filter(Boolean)),
  ).slice(0, MAX_TAGS)
}

// Ensure every name exists in the `tags` dictionary; return name → id. New names
// are inserted (conflicts on the unique name are ignored), then all are read
// back so existing tags resolve to their stored id. `createdBy` is recorded on
// freshly inserted tags only — an existing tag keeps its original author.
async function upsertTagIds(
  db: DB,
  names: string[],
  createdBy = '',
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(names))
  if (unique.length === 0) return new Map()
  await db
    .insert(tags)
    .values(
      unique.map((name) => ({ id: String(genid.nextId()), name, createdBy })),
    )
    .onConflictDoNothing()
  const rows = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(inArray(tags.name, unique))
  return new Map(rows.map((r) => [r.name, r.id]))
}

// Resolve normalized tag names to their stored IDs (creating any missing ones),
// preserving the input order. The order is what gets persisted in `links.tags`.
async function tagNamesToIds(
  db: DB,
  names: string[],
  createdBy = '',
): Promise<string[]> {
  const idByName = await upsertTagIds(db, names, createdBy)
  return names.map((n) => idByName.get(n)).filter((id): id is string => !!id)
}

// Replace the inline tag-ID column on rows with their display names, the shape
// the API/UI expects (`Link.tags: string[]`). One dictionary lookup covers the
// whole batch; IDs whose tag is missing or soft-deleted drop out.
async function attachTagNames(db: DB, rows: LinkRow[]): Promise<Link[]> {
  const ids = Array.from(new Set(rows.flatMap((r) => r.tags)))
  if (ids.length === 0) return rows
  const dict = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(and(inArray(tags.id, ids), eq(tags.isDeleted, 0)))
  const nameById = new Map(dict.map((d) => [d.id, d.name]))
  return rows.map((r) => ({
    ...r,
    tags: r.tags
      .map((id) => nameById.get(id))
      .filter((n): n is string => n !== undefined),
  }))
}

// KV cache key. Multi-domain links are namespaced by host so the same slug can
// point to different destinations per domain.
export function linkCacheKey(domain: string, slug: string): string {
  return `link:${domain}:${slug}`
}

// Normalize a slug for lookup/storage. Case-insensitive mode folds to lowercase
// so `/AbC` and `/abc` resolve to the same link.
export function normalizeSlug(slug: string, env?: CloudflareEnv): string {
  return getConfig(env).caseSensitive ? slug : slug.toLowerCase()
}

export function isExpired(expiresAt: Date | null): boolean {
  return expiresAt !== null && expiresAt.getTime() <= Date.now()
}

// Three-state cache read: a Link (positive hit), 'negative' (tombstone hit —
// known not to exist, skip the DB), or null (not cached, fall through to DB).
async function readCache(
  env: CloudflareEnv,
  domain: string,
  slug: string,
): Promise<Link | 'negative' | null> {
  try {
    const raw = await env.KV.get(linkCacheKey(domain, slug), 'text')
    if (raw === null) return null
    if (raw === NEGATIVE_CACHE) return 'negative'
    const parsed = JSON.parse(raw) as Link
    // JSON round-trips timestamps to strings — restore the Date shape.
    return {
      ...parsed,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    }
  } catch (error) {
    logger.warn('KV read error', error instanceof Error ? error.message : error)
    return null
  }
}

// Write a short-TTL tombstone for a slug that resolved to nothing. No-op when
// disabled (TTL 0). A real create/import later overwrites this same key.
async function writeNegativeCache(
  env: CloudflareEnv,
  domain: string,
  slug: string,
): Promise<void> {
  const ttl = getConfig(env).negativeCacheTtl
  if (ttl <= 0) return
  try {
    await env.KV.put(linkCacheKey(domain, slug), NEGATIVE_CACHE, {
      expirationTtl: Math.max(60, ttl),
    })
  } catch (error) {
    logger.warn(
      'KV write error',
      error instanceof Error ? error.message : error,
    )
  }
}

async function writeCache(
  env: CloudflareEnv,
  domain: string,
  slug: string,
  link: Link,
): Promise<void> {
  // Skip caching a link that outlives its own KV entry's minimum TTL: KV floors
  // expirationTtl to 60s, so a link expiring sooner would linger as a stale hit
  // (served, then purged by the route's isExpired check). Let those fall through
  // to D1 — they're about to vanish anyway, so the traffic is negligible.
  if (link.expiresAt) {
    const remainingSec = Math.floor(
      (link.expiresAt.getTime() - Date.now()) / 1000,
    )
    if (remainingSec < 60) return
  }
  try {
    await env.KV.put(linkCacheKey(domain, slug), JSON.stringify(link), {
      expirationTtl: Math.max(60, getConfig(env).linkCacheTtl),
    })
  } catch (error) {
    logger.warn(
      'KV write error',
      error instanceof Error ? error.message : error,
    )
  }
}

export async function purgeLink(
  env: CloudflareEnv,
  domain: string,
  slug: string,
): Promise<void> {
  try {
    await env.KV.delete(linkCacheKey(domain, slug))
  } catch (error) {
    logger.warn(
      'KV delete error',
      error instanceof Error ? error.message : error,
    )
  }
}

// Click-limit gate. For a link with `config.maxVisits`, reads the KV counter
// `visits:{id}` and returns true once the cap is reached (caller treats it as
// expired). Otherwise schedules a background increment via `waitUntil` so the
// hot path pays only one KV read. No-op for links without `maxVisits`. KV is
// eventually consistent, so the limit is approximate under concurrency.
export async function visitLimitReached(
  env: CloudflareEnv,
  link: Link,
  ctx: { waitUntil: (p: Promise<unknown>) => void },
): Promise<boolean> {
  const max = link.config.maxVisits
  if (!max) return false
  const key = `visits:${link.id}`
  let count: number
  try {
    const raw = await env.KV.get(key)
    count = raw ? Number(raw) : 0
  } catch (error) {
    logger.warn('KV read error', error instanceof Error ? error.message : error)
    return false
  }
  if (count >= max) {
    ctx.waitUntil(env.KV.delete(key).catch(() => {}))
    return true
  }
  ctx.waitUntil(env.KV.put(key, String(count + 1)).catch(() => {}))
  return false
}

// Resolve a link: KV cache → D1 fallback → fill cache. Returns null when the
// slug doesn't exist (caller handles not-found / expiry).
export async function resolveLink(
  env: CloudflareEnv,
  domain: string,
  rawSlug: string,
): Promise<Link | null> {
  const slug = normalizeSlug(rawSlug, env)

  const cached = await readCache(env, domain, slug)
  if (cached === 'negative') return null
  if (cached) return cached

  const db = await getDb(env)
  // Redirect hot path: tags aren't displayed, so skip the name resolution and
  // keep the raw row (its `tags` holds IDs, unread here).
  const row =
    (
      await db
        .select()
        .from(links)
        .where(
          and(
            eq(links.slug, slug),
            eq(links.domain, domain),
            eq(links.isDeleted, 0),
          ),
        )
        .limit(1)
    )[0] ?? null

  if (row && !isExpired(row.expiresAt)) {
    await writeCache(env, domain, slug, row)
  } else if (!row) {
    // Slug doesn't exist — cache the miss so a flood of lookups for the same
    // non-existent slug doesn't keep hitting D1. Gated to validly-formatted
    // slugs: malformed scans can never match a stored row, so skipping them
    // avoids polluting KV with one tombstone per junk request.
    if (!validateSlug(slug)) await writeNegativeCache(env, domain, slug)
  }
  return row
}

// ===================== Repository (dashboard CRUD) =====================

export type SortKey = 'createdAt' | 'updatedAt' | 'expiresAt'
export type RepoResult =
  | { ok: true; link: Link }
  | { ok: false; status: number; error: string }

const SORT_COLUMNS = {
  createdAt: links.createdAt,
  updatedAt: links.updatedAt,
  expiresAt: links.expiresAt,
} as const

// Find a row by (slug, domain) regardless of soft-delete state — the unique
// index covers deleted rows too, so create/update must see them.
async function findBySlugDomain(
  env: CloudflareEnv,
  domain: string,
  slug: string,
): Promise<Link | null> {
  const db = await getDb(env)
  return (
    (
      await db
        .select()
        .from(links)
        .where(and(eq(links.slug, slug), eq(links.domain, domain)))
        .limit(1)
    )[0] ?? null
  )
}

export async function getLinkById(
  env: CloudflareEnv,
  id: string,
): Promise<Link | null> {
  const db = await getDb(env)
  const row = (
    await db
      .select()
      .from(links)
      .where(and(eq(links.id, id), eq(links.isDeleted, 0)))
      .limit(1)
  )[0]
  if (!row) return null
  return (await attachTagNames(db, [row]))[0]!
}

export type LinkStatus = 'active' | 'disabled' | 'expired'

export interface ListOptions {
  limit: number
  offset: number
  sort?: SortKey
  status?: LinkStatus
  createdBy?: string
  // createdAt range (epoch ms).
  startAt?: number
  endAt?: number
  // Tag filter: match links that carry these tags (AND = all, OR = any).
  // `untagged` overrides `tags` and matches links with no tags.
  tags?: string[]
  tagMatch?: 'and' | 'or'
  untagged?: boolean
}

// Build the WHERE conditions shared by the list query and its count, so a
// filtered page reports a matching total.
function listConditions(opts: ListOptions) {
  const now = new Date()
  const conds = [eq(links.isDeleted, 0)]
  if (opts.createdBy) conds.push(eq(links.createdBy, opts.createdBy))
  if (opts.startAt) conds.push(gte(links.createdAt, new Date(opts.startAt)))
  if (opts.endAt) conds.push(lte(links.createdAt, new Date(opts.endAt)))
  // `disabled` lives inside the config JSON; json_extract returns 1 for true,
  // NULL when absent. `IS NOT 1` keeps NULL/0 rows in the "active" set.
  const notDisabled = sql`json_extract(${links.config}, '$.disabled') is not 1`
  const isDisabled = sql`json_extract(${links.config}, '$.disabled') = 1`
  if (opts.status === 'disabled') {
    conds.push(isDisabled)
  } else if (opts.status === 'expired') {
    conds.push(and(isNotNull(links.expiresAt), lte(links.expiresAt, now))!)
  } else if (opts.status === 'active') {
    conds.push(notDisabled)
    conds.push(or(isNull(links.expiresAt), gt(links.expiresAt, now))!)
  }
  // Tag filter, evaluated against the inline `links.tags` ID array. Filters take
  // tag names; each name is resolved to its ID through the `tags` dictionary
  // inside the EXISTS so a rename is transparent to stored links.
  if (opts.untagged) {
    conds.push(sql`json_array_length(${links.tags}) = 0`)
  } else if (opts.tags && opts.tags.length > 0) {
    const hasTag = (tag: string) =>
      sql`exists (select 1 from json_each(${links.tags}) je inner join ${tags} on ${tags.id} = je.value where ${tags.name} = ${tag} and ${tags.isDeleted} = 0)`
    if (opts.tagMatch === 'or') {
      conds.push(sql`(${sql.join(opts.tags.map(hasTag), sql` or `)})`)
    } else {
      for (const tag of opts.tags) conds.push(hasTag(tag))
    }
  }
  return and(...conds)
}

export async function listLinks(
  env: CloudflareEnv,
  opts: ListOptions,
): Promise<{ links: Link[]; total: number }> {
  const db = await getDb(env)
  const sortCol = SORT_COLUMNS[opts.sort ?? 'createdAt']
  const where = listConditions(opts)
  const rows = await db
    .select()
    .from(links)
    .where(where)
    .orderBy(desc(sortCol))
    .limit(opts.limit)
    .offset(opts.offset)
  const totalRow = await db
    .select({ value: sql<number>`count(*)` })
    .from(links)
    .where(where)
  return {
    links: await attachTagNames(db, rows),
    total: Number(totalRow[0]?.value ?? 0),
  }
}

// Distinct non-empty link authors, for the dashboard creator filter.
export async function listCreators(env: CloudflareEnv): Promise<string[]> {
  const db = await getDb(env)
  const rows = await db
    .selectDistinct({ createdBy: links.createdBy })
    .from(links)
    .where(eq(links.isDeleted, 0))
  return rows
    .map((r) => r.createdBy)
    .filter((v) => v.length > 0)
    .sort((a, b) => a.localeCompare(b))
}

// Count of non-deleted links — backs the overview "total links" card.
export async function countLinks(env: CloudflareEnv): Promise<number> {
  const db = await getDb(env)
  const row = await db
    .select({ value: sql<number>`count(*)` })
    .from(links)
    .where(eq(links.isDeleted, 0))
  return Number(row[0]?.value ?? 0)
}

export async function searchLinks(
  env: CloudflareEnv,
  query: string,
  opts: { limit: number },
): Promise<Link[]> {
  const db = await getDb(env)
  const q = `%${query.trim()}%`
  const rows = await db
    .select()
    .from(links)
    .where(
      and(
        eq(links.isDeleted, 0),
        or(
          like(links.slug, q),
          like(links.url, q),
          like(links.comment, q),
          // Match links carrying a tag whose name matches the query.
          sql`exists (select 1 from json_each(${links.tags}) je inner join ${tags} on ${tags.id} = je.value where ${tags.name} like ${q} and ${tags.isDeleted} = 0)`,
        ),
      ),
    )
    .orderBy(desc(links.createdAt))
    .limit(opts.limit)
  return attachTagNames(db, rows)
}

// Every tag in the dictionary with its non-deleted link count, for the dashboard
// tag filter. Counts only links that are not soft-deleted; tags with no live
// link sort last (count 0).
export async function listTags(
  env: CloudflareEnv,
): Promise<{ tag: string; count: number }[]> {
  const db = await getDb(env)
  const rows = await db.all<{ tag: string; count: number }>(sql`
    select t.name as tag,
      (
        select count(*) from ${links} l
        where l.is_deleted = 0
          and exists (select 1 from json_each(l.tags) je where je.value = t.id)
      ) as count
    from ${tags} t
    where t.is_deleted = 0
    order by count desc, tag asc
  `)
  return rows.map((r) => ({ tag: String(r.tag), count: Number(r.count) }))
}

// Add or remove a single tag across many links (dashboard bulk action). The tag
// name is resolved to its ID once, then each link's inline `tags` ID array is
// mutated and written back. The cached redirect copy is purged so it rebuilds.
// Returns the number of rows changed.
export async function bulkTagLinks(
  env: CloudflareEnv,
  ids: string[],
  tag: string,
  op: 'add' | 'remove',
  createdBy = '',
): Promise<number> {
  const db = await getDb(env)
  // Add creates the tag if it's new; remove on an unknown tag is a no-op.
  const tagId =
    op === 'add'
      ? (await upsertTagIds(db, [tag], createdBy)).get(tag)
      : (
          await db
            .select({ id: tags.id })
            .from(tags)
            .where(eq(tags.name, tag))
            .limit(1)
        )[0]?.id
  if (!tagId) return 0
  let updated = 0
  for (const id of ids) {
    const current = (
      await db
        .select()
        .from(links)
        .where(and(eq(links.id, id), eq(links.isDeleted, 0)))
        .limit(1)
    )[0]
    if (!current) continue
    const has = current.tags.includes(tagId)
    let next: string[]
    if (op === 'add') {
      if (has || current.tags.length >= MAX_TAGS) continue
      next = [...current.tags, tagId]
    } else {
      if (!has) continue
      next = current.tags.filter((x) => x !== tagId)
    }
    const row = (
      await db
        .update(links)
        .set({ tags: next, updatedAt: new Date() })
        .where(eq(links.id, id))
        .returning()
    )[0]!
    await purgeLink(env, row.domain, row.slug)
    updated++
  }
  return updated
}

// Replace a single link's entire tag set (dashboard inline editor saves the
// staged selection on close). Resolves the names to IDs (creating new ones) and
// writes the inline `tags` column. Returns false when the link doesn't exist.
export async function setLinkTags(
  env: CloudflareEnv,
  id: string,
  tagNames: string[],
  createdBy = '',
): Promise<boolean> {
  const db = await getDb(env)
  const current = (
    await db
      .select()
      .from(links)
      .where(and(eq(links.id, id), eq(links.isDeleted, 0)))
      .limit(1)
  )[0]
  if (!current) return false
  const ids = await tagNamesToIds(db, normalizeTagList(tagNames), createdBy)
  const row = (
    await db
      .update(links)
      .set({ tags: ids, updatedAt: new Date() })
      .where(eq(links.id, id))
      .returning()
  )[0]!
  await purgeLink(env, row.domain, row.slug)
  return true
}

// Build the stored LinkConfig from input config + password handling.
async function buildConfig(
  env: CloudflareEnv,
  input: CreateLinkInput | EditLinkInput,
  url: string,
  previous?: LinkConfig,
): Promise<LinkConfig> {
  const config: LinkConfig = { ...(input.config ?? {}) }
  // Password: undefined keeps previous; null/'' clears; string (re)hashes.
  if (input.password === undefined) {
    if (previous?.passwordHash) config.passwordHash = previous.passwordHash
  } else if (input.password) {
    config.passwordHash = await hashPasswordFn(input.password)
  }
  // Auto Safe-Browsing: when the caller didn't explicitly mark the link unsafe,
  // probe the destination via DoH and flag it on a hit. Best-effort and a no-op
  // when SAFE_BROWSING_DOH is unset — never blocks the write.
  if (config.unsafe === undefined && url) {
    if (await isUnsafeUrl(env, url)) config.unsafe = true
  }
  return config
}

// Maximum attempts to land a non-colliding random slug before giving up.
const SLUG_MAX_RETRIES = 12

// Allocate a random slug with race-safe insertion. `onConflictDoNothing` lets
// the unique index arbitrate uniqueness atomically (no check-then-insert race),
// and we retry with a longer slug to escape collision hot-spots — mirrors
// shortener's generateUniqueHash but without a separate pre-query.
async function insertWithRandomSlug(
  env: CloudflareEnv,
  domain: string,
  values: Omit<NewLink, 'slug'>,
): Promise<RepoResult> {
  const db = await getDb(env)
  const baseLen = getConfig(env).slugDefaultLength

  for (let attempt = 1; attempt <= SLUG_MAX_RETRIES; attempt++) {
    const length = baseLen + (attempt <= 4 ? 0 : attempt <= 8 ? 1 : 2)
    const slug = normalizeSlug(randomSlug(length), env)
    const row = (
      await db
        .insert(links)
        .values({ ...values, slug })
        .onConflictDoNothing()
        .returning()
    )[0]
    // Tags are applied + cached by the caller once the row lands.
    if (row) return { ok: true, link: { ...row, tags: [] } }
    logger.debug(`Random slug collision on attempt ${attempt}: ${slug}`)
  }
  return { ok: false, status: 500, error: 'Failed to allocate a unique slug' }
}

export async function createLink(
  env: CloudflareEnv,
  input: CreateLinkInput,
  requestDomain: string,
  createdBy = '',
): Promise<RepoResult> {
  const domain = input.domain?.trim() || requestDomain
  const config = await buildConfig(env, input, input.url)
  const tagNames = normalizeTagList(input.tags)
  const db = await getDb(env)
  const tagIds = await tagNamesToIds(db, tagNames, createdBy)
  const baseValues: Omit<NewLink, 'slug'> = {
    id: String(genid.nextId()),
    domain,
    url: input.url,
    title: input.title ?? '',
    comment: input.comment ?? '',
    createdBy,
    config,
    tags: tagIds,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    isDeleted: 0,
    updatedAt: new Date(),
  }

  const result = await insertLinkRow(env, domain, input, baseValues)
  if (!result.ok) return result

  // Hand back the link with display names and cache it.
  const link: Link = { ...result.link, tags: tagNames }
  await writeCache(env, link.domain, link.slug, link)
  return { ok: true, link }
}

// Insert the link row (random or user-supplied slug). The `tags` ID column is
// already part of `baseValues`; the returned link's `tags` is overwritten with
// display names by `createLink`.
async function insertLinkRow(
  env: CloudflareEnv,
  domain: string,
  input: CreateLinkInput,
  baseValues: Omit<NewLink, 'slug'>,
): Promise<RepoResult> {
  // No user-supplied slug → allocate a random one with collision retry.
  if (!input.slug?.trim()) {
    return insertWithRandomSlug(env, domain, baseValues)
  }

  // User-supplied slug: must be unique among active rows; a soft-deleted row
  // holding this slug is revived in place.
  const rawSlug = input.slug.trim()
  const slugError = validateSlug(rawSlug)
  if (slugError) return { ok: false, status: 400, error: `slug:${slugError}` }
  const slug = normalizeSlug(rawSlug, env)

  const existing = await findBySlugDomain(env, domain, slug)
  if (existing && existing.isDeleted === 0) {
    return { ok: false, status: 409, error: 'Slug already exists' }
  }

  const values: NewLink = {
    ...baseValues,
    id: existing?.id ?? baseValues.id,
    slug,
  }

  const db = await getDb(env)
  const row = existing
    ? // Revive a soft-deleted row holding this slug.
      (
        await db
          .update(links)
          .set(values)
          .where(eq(links.id, existing.id))
          .returning()
      )[0]!
    : (await db.insert(links).values(values).returning())[0]!
  return { ok: true, link: { ...row, tags: [] } }
}

export async function updateLink(
  env: CloudflareEnv,
  input: EditLinkInput,
  createdBy = '',
): Promise<RepoResult> {
  const current = await getLinkById(env, input.id)
  if (!current) return { ok: false, status: 404, error: 'Link not found' }

  const domain = input.domain?.trim() || current.domain
  const rawSlug = input.slug?.trim() || current.slug
  const slugError = validateSlug(rawSlug)
  if (slugError) return { ok: false, status: 400, error: `slug:${slugError}` }
  const slug = normalizeSlug(rawSlug, env)

  const keyChanged = slug !== current.slug || domain !== current.domain
  if (keyChanged) {
    const clash = await findBySlugDomain(env, domain, slug)
    if (clash && clash.id !== current.id && clash.isDeleted === 0) {
      return { ok: false, status: 409, error: 'Slug already exists' }
    }
  }

  const config = await buildConfig(
    env,
    input,
    input.url ?? current.url,
    current.config,
  )
  // Omitted tags keep the current set; provided tags replace it. `current.tags`
  // is already names (getLinkById resolved them).
  const db = await getDb(env)
  const tagNames =
    input.tags === undefined ? current.tags : normalizeTagList(input.tags)
  const tagIds =
    input.tags === undefined
      ? undefined
      : await tagNamesToIds(db, tagNames, createdBy)
  const row = (
    await db
      .update(links)
      .set({
        slug,
        domain,
        url: input.url ?? current.url,
        title: input.title ?? current.title,
        comment: input.comment ?? current.comment,
        config,
        // Only rewrite the tag column when the caller supplied tags.
        ...(tagIds !== undefined ? { tags: tagIds } : {}),
        expiresAt:
          input.expiresAt === undefined
            ? current.expiresAt
            : input.expiresAt
              ? new Date(input.expiresAt)
              : null,
        updatedAt: new Date(),
      })
      .where(eq(links.id, current.id))
      .returning()
  )[0]!

  if (keyChanged) await purgeLink(env, current.domain, current.slug)
  const link: Link = { ...row, tags: tagNames }
  await writeCache(env, domain, slug, link)
  return { ok: true, link }
}

export async function upsertLink(
  env: CloudflareEnv,
  input: CreateLinkInput,
  requestDomain: string,
  createdBy = '',
): Promise<RepoResult> {
  const domain = input.domain?.trim() || requestDomain
  const rawSlug = input.slug?.trim()
  if (rawSlug) {
    const existing = await findBySlugDomain(
      env,
      domain,
      normalizeSlug(rawSlug, env),
    )
    if (existing && existing.isDeleted === 0) {
      return updateLink(env, { ...input, id: existing.id }, createdBy)
    }
  }
  return createLink(env, input, requestDomain, createdBy)
}

export async function deleteLink(
  env: CloudflareEnv,
  id: string,
): Promise<RepoResult> {
  const current = await getLinkById(env, id)
  if (!current) return { ok: false, status: 404, error: 'Link not found' }
  const db = await getDb(env)
  await db
    .update(links)
    .set({ isDeleted: 1, updatedAt: new Date() })
    .where(eq(links.id, id))
  await purgeLink(env, current.domain, current.slug)
  return { ok: true, link: current }
}

export interface ImportReport {
  success: number
  skipped: number
  failed: number
  failedItems: { slug: string; reason: string }[]
}

// Non-destructive import: existing active (slug,domain) is skipped, a
// soft-deleted one is revived, otherwise inserted. Config (incl. passwordHash)
// and timestamps are preserved verbatim.
export async function importLinks(
  env: CloudflareEnv,
  items: ImportLinkInput[],
  createdBy = '',
): Promise<ImportReport> {
  const db = await getDb(env)
  const report: ImportReport = {
    success: 0,
    skipped: 0,
    failed: 0,
    failedItems: [],
  }

  for (const item of items) {
    const domain = item.domain?.trim() || ''
    const rawSlug = item.slug.trim()
    const slugError = validateSlug(rawSlug)
    if (slugError) {
      report.failed++
      report.failedItems.push({ slug: rawSlug, reason: `slug:${slugError}` })
      continue
    }
    const slug = normalizeSlug(rawSlug, env)
    const existing = await findBySlugDomain(env, domain, slug)
    if (existing && existing.isDeleted === 0) {
      report.skipped++
      continue
    }

    const values: NewLink = {
      // Always mint a fresh id for new rows — reusing the exported id would
      // collide with an existing PK when importing into a populated DB.
      id: existing?.id ?? String(genid.nextId()),
      slug,
      domain,
      url: item.url,
      title: item.title ?? '',
      comment: item.comment ?? '',
      config: (item.config ?? {}) as LinkConfig,
      tags: await tagNamesToIds(db, normalizeTagList(item.tags), createdBy),
      expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
      isDeleted: 0,
      updatedAt: new Date(),
      ...(item.createdAt ? { createdAt: new Date(item.createdAt) } : {}),
    }
    if (existing) {
      await db.update(links).set(values).where(eq(links.id, existing.id))
    } else {
      await db.insert(links).values(values)
    }
    report.success++
  }
  return report
}
