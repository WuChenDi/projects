import type { Link } from '@/database/schema'
import { listLinks } from '@/lib/links'
import { logger } from '@/lib/logger'
import { getR2 } from '@/lib/r2'

const PAGE_SIZE = 1000
const MAX_LINKS = 50000

// Page through listLinks until exhausted, hard-capped at MAX_LINKS. When the
// cap is hit the result is flagged truncated and a warning is logged.
export async function fetchAllLinks(
  env: CloudflareEnv,
): Promise<{ links: Link[]; truncated: boolean }> {
  const all: Link[] = []
  let offset = 0
  for (;;) {
    const { links, total } = await listLinks(env, { limit: PAGE_SIZE, offset })
    all.push(...links)
    offset += PAGE_SIZE
    if (all.length >= MAX_LINKS) {
      logger.warn(
        `Link export cap of ${MAX_LINKS} reached (total ${total}) — result truncated`,
      )
      return { links: all.slice(0, MAX_LINKS), truncated: true }
    }
    if (links.length < PAGE_SIZE || offset >= total) {
      return { links: all, truncated: false }
    }
  }
}

// Write a JSON snapshot of all active links to R2 under backups/. Returns the
// object key, or null when R2 is not configured.
export async function backupToR2(env: CloudflareEnv): Promise<string | null> {
  const r2 = getR2(env)
  if (!r2) return null

  const { links, truncated } = await fetchAllLinks(env)
  const payload = JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: links.length,
    truncated,
    links: links.map((l) => ({
      id: l.id,
      slug: l.slug,
      domain: l.domain,
      url: l.url,
      comment: l.comment,
      config: l.config,
      expiresAt: l.expiresAt ? l.expiresAt.getTime() : null,
      createdAt: l.createdAt.getTime(),
    })),
  })

  const key = `backups/${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  await r2.put(key, payload, {
    httpMetadata: { contentType: 'application/json' },
  })
  return key
}
