import { eq, lt } from 'drizzle-orm'
import { links } from '@/database/schema'
import { getDrizzle, softDelete, withNotDeleted } from '@/lib'
import type { CloudflareEnv } from '@/types'

interface CleanupResult {
  deletedCount: number
  cacheCleanedCount: number
  errors: string[]
  executionTime: number
}

const BATCH_SIZE = 50

export async function cleanupExpiredLinks(
  env: CloudflareEnv,
): Promise<CleanupResult> {
  const startTime = Date.now()
  const result: CleanupResult = {
    deletedCount: 0,
    cacheCleanedCount: 0,
    errors: [],
    executionTime: 0,
  }

  logger.info('Starting expired links cleanup task')

  try {
    const db = getDrizzle(env)
    const now = Date.now()

    const expiredLinks = await db
      .select()
      .from(links)
      .where(withNotDeleted(links, lt(links.expiresAt, now)))

    logger.info(`Found ${expiredLinks.length} expired links to cleanup`)

    if (expiredLinks.length === 0) {
      result.executionTime = Date.now() - startTime
      return result
    }

    for (let i = 0; i < expiredLinks.length; i += BATCH_SIZE) {
      const batch = expiredLinks.slice(i, i + BATCH_SIZE)
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1
      logger.debug(`Processing batch ${batchIndex} with ${batch.length} links`)

      for (const link of batch) {
        try {
          await db
            .update(links)
            .set(softDelete())
            .where(eq(links.hash, link.hash))
            .execute()

          result.deletedCount++
        } catch (error) {
          const msg = `Failed to delete link ${link.hash}: ${error instanceof Error ? error.message : 'Unknown error'}`
          logger.error(msg)
          result.errors.push(msg)
        }
      }

      if (env.SHORTENER_KV) {
        for (const link of batch) {
          try {
            await Promise.all([
              env.SHORTENER_KV.delete(`url:${link.hash}`),
              env.SHORTENER_KV.delete(`og:${link.hash}`),
            ])
            result.cacheCleanedCount++
          } catch (error) {
            const msg = `Cache delete failed for ${link.hash}: ${error instanceof Error ? error.message : 'Unknown error'}`
            logger.warn(msg)
            result.errors.push(msg)
          }
        }
      }
    }

    result.executionTime = Date.now() - startTime
    logger.info('Expired links cleanup completed', {
      deletedCount: result.deletedCount,
      cacheCleanedCount: result.cacheCleanedCount,
      errorCount: result.errors.length,
      executionTimeMs: result.executionTime,
    })
    return result
  } catch (error) {
    result.executionTime = Date.now() - startTime
    const msg = `Cleanup task failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error(msg, error)
    result.errors.push(msg)
    return result
  }
}
