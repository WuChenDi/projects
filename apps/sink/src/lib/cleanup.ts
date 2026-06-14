import { and, eq, lt } from 'drizzle-orm'
import { links } from '@/database/schema'
import { getDb } from '@/lib/db'
import { linkCacheKey } from '@/lib/links'
import { logger } from '@/lib/logger'

interface CleanupResult {
  deletedCount: number
  cacheCleanedCount: number
  errors: string[]
  executionTimeMs: number
}

const BATCH_SIZE = 50

// Soft-delete expired links + purge their KV cache. Driven by the worker's
// `scheduled()` handler (cron "0 0 * * *").
export async function cleanupExpiredLinks(
  env: CloudflareEnv,
): Promise<CleanupResult> {
  const startedAt = Date.now()
  const result: CleanupResult = {
    deletedCount: 0,
    cacheCleanedCount: 0,
    errors: [],
    executionTimeMs: 0,
  }

  logger.info('Starting expired links cleanup')

  try {
    const db = await getDb(env)
    const now = new Date()

    const expired = await db
      .select()
      .from(links)
      .where(and(eq(links.isDeleted, 0), lt(links.expiresAt, now)))

    logger.info(`Found ${expired.length} expired links`)
    if (expired.length === 0) {
      result.executionTimeMs = Date.now() - startedAt
      return result
    }

    for (let i = 0; i < expired.length; i += BATCH_SIZE) {
      const batch = expired.slice(i, i + BATCH_SIZE)

      for (const link of batch) {
        try {
          await db
            .update(links)
            .set({ isDeleted: 1, updatedAt: new Date() })
            .where(eq(links.id, link.id))
          result.deletedCount++
        } catch (error) {
          const msg = `Failed to soft-delete link ${link.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
          logger.error(msg)
          result.errors.push(msg)
        }

        try {
          await env.KV.delete(linkCacheKey(link.domain, link.slug))
          result.cacheCleanedCount++
        } catch (error) {
          const msg = `Cache purge failed for ${link.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
          logger.warn(msg)
          result.errors.push(msg)
        }
      }
    }

    result.executionTimeMs = Date.now() - startedAt
    logger.info('Cleanup completed', JSON.stringify(result))
    return result
  } catch (error) {
    result.executionTimeMs = Date.now() - startedAt
    const msg = `Cleanup task failed: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error(msg)
    result.errors.push(msg)
    return result
  }
}
