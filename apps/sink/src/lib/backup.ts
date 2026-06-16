import { listLinks } from '@/lib/links'
import { getR2 } from '@/lib/r2'

const BACKUP_MAX = 5000

// Write a JSON snapshot of all active links to R2 under backups/. Returns the
// object key, or null when R2 is not configured.
export async function backupToR2(env: CloudflareEnv): Promise<string | null> {
  const r2 = getR2(env)
  if (!r2) return null

  const { links } = await listLinks(env, { limit: BACKUP_MAX, offset: 0 })
  const payload = JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: links.length,
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
