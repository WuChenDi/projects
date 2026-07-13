import { and, eq, sql } from 'drizzle-orm'
import type { Link } from '@/database/schema'
import { links } from '@/database/schema'
import { visitsKey } from '@/lib/cache-keys'
import { getDb } from '@/lib/db'
import { getConfig } from '@/lib/env'
import { readCache, writeCache, writeNegativeCache } from '@/lib/links/cache'
import { logger } from '@/lib/logger'
import { validateSlug } from '@/lib/slug'

// Normalize a slug for lookup/storage. Case-insensitive mode folds to lowercase
// so `/AbC` and `/abc` resolve to the same link.
export function normalizeSlug(slug: string, env?: CloudflareEnv): string {
  return getConfig(env).caseSensitive ? slug : slug.toLowerCase()
}

export function isExpired(expiresAt: Date | null): boolean {
  return expiresAt !== null && expiresAt.getTime() <= Date.now()
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
  const key = visitsKey(link.id)
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

// Persist the visit-cap hit: mark the link disabled in D1 so the cap survives
// KV cache expiry/rebuild (otherwise the counter restarts from 0 and the link
// serves another N visits). `json_set` patches the config in place — the
// caller's `link` may come from a stale KV copy, so we must not overwrite the
// whole config with it.
// Best-effort: a transient D1 error must not turn the redirect path into a
// 500 — the request still serves not-found, and the next cap hit retries the
// persist.
export async function disableLinkOnVisitCap(
  env: CloudflareEnv,
  link: Link,
): Promise<void> {
  try {
    const db = await getDb(env)
    await db
      .update(links)
      .set({
        config: sql`json_set(${links.config}, '$.disabled', json('true'))`,
        updatedAt: new Date(),
      })
      .where(eq(links.id, link.id))
  } catch (error) {
    logger.warn(
      'Failed to persist visit-cap disable',
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

  // Cache-penetration guard: a slug that fails validateSlug can never match a
  // stored row (every write path validates), so short-circuit before touching
  // KV or D1 — malformed scans never reach the database.
  if (validateSlug(slug) !== null) return null

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
