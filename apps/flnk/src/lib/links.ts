import { hashPasswordFn } from '@cdlab996/utils'
import {
  and,
  desc,
  eq,
  gt,
  gte,
  isNotNull,
  isNull,
  like,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import type { Link, LinkConfig, NewLink } from '@/database/schema'
import { links } from '@/database/schema'
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
  return (
    (
      await db
        .select()
        .from(links)
        .where(and(eq(links.id, id), eq(links.isDeleted, 0)))
        .limit(1)
    )[0] ?? null
  )
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
  return { links: rows, total: Number(totalRow[0]?.value ?? 0) }
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
  return db
    .select()
    .from(links)
    .where(
      and(
        eq(links.isDeleted, 0),
        or(like(links.slug, q), like(links.url, q), like(links.comment, q)),
      ),
    )
    .orderBy(desc(links.createdAt))
    .limit(opts.limit)
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
    const link = (
      await db
        .insert(links)
        .values({ ...values, slug })
        .onConflictDoNothing()
        .returning()
    )[0]
    if (link) {
      await writeCache(env, domain, slug, link)
      return { ok: true, link }
    }
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
  const baseValues: Omit<NewLink, 'slug'> = {
    id: String(genid.nextId()),
    domain,
    url: input.url,
    comment: input.comment ?? '',
    createdBy,
    tags: input.tags ?? [],
    config,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    isDeleted: 0,
    updatedAt: new Date(),
  }

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
  let link: Link
  if (existing) {
    // Revive a soft-deleted row holding this slug.
    link = (
      await db
        .update(links)
        .set(values)
        .where(eq(links.id, existing.id))
        .returning()
    )[0]!
  } else {
    link = (await db.insert(links).values(values).returning())[0]!
  }
  await writeCache(env, domain, slug, link)
  return { ok: true, link }
}

export async function updateLink(
  env: CloudflareEnv,
  input: EditLinkInput,
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
  const db = await getDb(env)
  const link = (
    await db
      .update(links)
      .set({
        slug,
        domain,
        url: input.url ?? current.url,
        comment: input.comment ?? current.comment,
        tags: input.tags ?? current.tags,
        config,
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
      return updateLink(env, { ...input, id: existing.id })
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
      comment: item.comment ?? '',
      tags: item.tags ?? [],
      config: (item.config ?? {}) as LinkConfig,
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
