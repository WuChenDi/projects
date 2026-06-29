import { logger } from '@cdlab996/utils'
import { eq } from 'drizzle-orm'
import { userConfig } from '@/database/schema'
import { getDb } from '@/lib/db'
import { runPush } from './runner'

/**
 * Entry point invoked by the Worker `scheduled()` handler.
 *
 * Multi-tenant: scans every owner's `user_config` for `cronEnabled`, then fires
 * one push per owner using that owner's configured recipient list — each scoped
 * to its own tenant. Errors are logged per owner but never thrown — the Worker
 * scheduler retries on its own.
 *
 * `env` is forwarded explicitly because `getCloudflareContext()` is only set up
 * by opennext's fetch wrapper, not in the `scheduled()` execution path.
 */
export async function runScheduledPush(env: CloudflareEnv): Promise<void> {
  try {
    const db = await getDb(env)
    const configs = await db
      .select()
      .from(userConfig)
      .where(eq(userConfig.cronEnabled, true))

    if (configs.length === 0) {
      logger.info('cron 触发但无启用定时推送的租户，跳过')
      return
    }

    for (const config of configs) {
      const userIds = Array.isArray(config.cronUserIds)
        ? config.cronUserIds
        : []
      if (userIds.length === 0) {
        logger.warn('cron 已启用但未配置参与用户，跳过', {
          ownerId: config.ownerId,
        })
        continue
      }

      try {
        const result = await runPush({
          ownerId: config.ownerId,
          trigger: 'cron',
          userIds,
          env,
        })
        logger.info('cron 推送完成', {
          ownerId: config.ownerId,
          batchId: result.batchId,
          successCount: result.successCount,
          failedCount: result.failedCount,
        })
      } catch (error) {
        logger.error('cron 推送失败', {
          ownerId: config.ownerId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } catch (error) {
    logger.error('cron 调度失败', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
