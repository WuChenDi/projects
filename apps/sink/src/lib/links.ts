import { and, eq } from 'drizzle-orm'
import type { Link } from '@/database/schema'
import { links } from '@/database/schema'
import { getDb } from '@/lib/db'
import { getConfig } from '@/lib/env'
import { logger } from '@/lib/logger'

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
