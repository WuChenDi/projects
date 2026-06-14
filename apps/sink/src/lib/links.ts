import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import type { Link, LinkConfig, NewLink } from '@/database/schema'
import { links } from '@/database/schema'
import { getDb } from '@/lib/db'
import { getConfig } from '@/lib/env'
import { genid } from '@/lib/genid'
import { hashLinkPassword } from '@/lib/hash'
import { logger } from '@/lib/logger'
import { defaultSlug, validateSlug } from '@/lib/slug'
import type { CreateLinkInput, EditLinkInput } from '@/schemas/link'

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

async function readCache(
  env: CloudflareEnv,
  domain: string,
  slug: string,
): Promise<Link | null> {
  try {
    const raw = await env.KV.get<Link>(linkCacheKey(domain, slug), 'json')
    if (!raw) return null
    // JSON round-trips timestamps to strings — restore the Date shape.
    return {
      ...raw,
      expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : null,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    }
  } catch (error) {
    logger.warn('KV read error', error instanceof Error ? error.message : error)
    return null
  }
}

async function writeCache(
  env: CloudflareEnv,
  domain: string,
  slug: string,
  link: Link,
): Promise<void> {
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

// Resolve a link: KV cache → D1 fallback → fill cache. Returns null when the
// slug doesn't exist (caller handles not-found / expiry).
export async function resolveLink(
  env: CloudflareEnv,
  domain: string,
  rawSlug: string,
): Promise<Link | null> {
  const slug = normalizeSlug(rawSlug, env)

  const cached = await readCache(env, domain, slug)
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

export async function listLinks(
  env: CloudflareEnv,
  opts: { limit: number; offset: number; sort?: SortKey },
): Promise<{ links: Link[]; total: number }> {
  const db = await getDb(env)
  const sortCol = SORT_COLUMNS[opts.sort ?? 'createdAt']
  const rows = await db
    .select()
    .from(links)
    .where(eq(links.isDeleted, 0))
    .orderBy(desc(sortCol))
    .limit(opts.limit)
    .offset(opts.offset)
  const totalRow = await db
    .select({ value: sql<number>`count(*)` })
    .from(links)
    .where(eq(links.isDeleted, 0))
  return { links: rows, total: Number(totalRow[0]?.value ?? 0) }
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
  input: CreateLinkInput | EditLinkInput,
  previous?: LinkConfig,
): Promise<LinkConfig> {
  const config: LinkConfig = { ...(input.config ?? {}) }
  // Password: undefined keeps previous; null/'' clears; string (re)hashes.
  if (input.password === undefined) {
    if (previous?.passwordHash) config.passwordHash = previous.passwordHash
  } else if (input.password) {
    config.passwordHash = await hashLinkPassword(input.password)
  }
  return config
}

export async function createLink(
  env: CloudflareEnv,
  input: CreateLinkInput,
  requestDomain: string,
): Promise<RepoResult> {
  const domain = input.domain?.trim() || requestDomain
  const rawSlug = input.slug?.trim() || defaultSlug(env)
  const slugError = validateSlug(rawSlug)
  if (slugError) return { ok: false, status: 400, error: `slug:${slugError}` }
  const slug = normalizeSlug(rawSlug, env)

  const existing = await findBySlugDomain(env, domain, slug)
  if (existing && existing.isDeleted === 0) {
    return { ok: false, status: 409, error: 'Slug already exists' }
  }

  const config = await buildConfig(input)
  const values: NewLink = {
    id: existing?.id ?? String(genid.nextId()),
    slug,
    domain,
    url: input.url,
    comment: input.comment ?? '',
    config,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    isDeleted: 0,
    updatedAt: new Date(),
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

  const config = await buildConfig(input, current.config)
  const db = await getDb(env)
  const link = (
    await db
      .update(links)
      .set({
        slug,
        domain,
        url: input.url ?? current.url,
        comment: input.comment ?? current.comment,
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
  return createLink(env, input, requestDomain)
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
