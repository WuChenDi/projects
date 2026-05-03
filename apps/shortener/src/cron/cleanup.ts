import { and, eq, lt } from 'drizzle-orm'
import { links } from '@/database/schema'
import { softDelete, useDrizzle, withNotDeleted } from '@/lib'
import type { CloudflareEnv } from '@/types'

interface CleanupResult {
  deletedCount: number
  cacheCleanedCount: number
  errors: string[]
  executionTime: number
}

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
    // Create a mock context for database initialization
    const mockContext = { env } as any
    const db = useDrizzle(mockContext)

    if (!db) {
      throw new Error('Database connection failed')
    }

    // Find all expired links that are not already deleted
    const currentTime = Date.now()
    logger.debug(
      `Looking for links expired before: ${new Date(currentTime).toISOString()}`,
    )

    const expiredLinks = await db
      .select()
      .from(links)
      .where(withNotDeleted(links, lt(links.expiresAt, currentTime)))

    logger.info(`Found ${expiredLinks.length} expired links to cleanup`)

    if (expiredLinks.length === 0) {
      logger.info('No expired links found, cleanup task completed')
      result.executionTime = Date.now() - startTime
      return result
    }

    // Process expired links in batches to avoid overwhelming the database
    const BATCH_SIZE = 50
    const batches: (typeof expiredLinks)[] = []
    for (let i = 0; i < expiredLinks.length; i += BATCH_SIZE) {
      const batch = expiredLinks.slice(i, i + BATCH_SIZE)
      if (batch.length > 0) {
        batches.push(batch)
      }
    }

    logger.info(`Processing ${batches.length} batches of expired links`)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]

      if (!batch || batch.length === 0) {
        logger.debug(`Skipping empty batch ${batchIndex + 1}`)
        continue
      }

      logger.debug(
        `Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} links`,
      )

      try {
        // Soft delete the batch of expired links
        const hashesToDelete = batch.map((link) => link.hash)

        for (const hash of hashesToDelete) {
          try {
            await db
              .update(links)
              .set(softDelete())
              .where(eq(links.hash, hash))
              .execute()

            result.deletedCount++
            logger.debug(`Soft deleted expired link: ${hash}`)
          } catch (deleteError) {
            const errorMsg = `Failed to delete link ${hash}: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`
            logger.error(errorMsg)
            result.errors.push(errorMsg)
          }
        }

        // Clean up cache for expired links
        if (env.SHORTENER_KV) {
          for (const link of batch) {
            try {
              const cacheKey = `url:${link.hash}`
              const ogCacheKey = `og:${link.hash}`

              await Promise.all([
                env.SHORTENER_KV.delete(cacheKey),
                env.SHORTENER_KV.delete(ogCacheKey),
              ])

              result.cacheCleanedCount++
              logger.debug(`Cleared cache for expired link: ${link.shortCode}`)
            } catch (cacheError) {
              const errorMsg = `Failed to clear cache for ${link.hash}: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`
              logger.warn(errorMsg)
              result.errors.push(errorMsg)
            }
          }
        }

        // Add a small delay between batches to prevent overwhelming the system
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (batchError) {
        const errorMsg = `Batch ${batchIndex + 1} processing failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`
        logger.error(errorMsg)
        result.errors.push(errorMsg)
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
    const errorMsg = `Cleanup task failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    logger.error(errorMsg, error)
    result.errors.push(errorMsg)
    return result
  }
}
