import { logger } from '@cdlab996/utils'
import { eq } from 'drizzle-orm'
import { globalConfig } from '@/database/schema'
import { getDb } from '@/lib/db'
import { runPush } from './runner'

/**
 * Entry point invoked by the Worker `scheduled()` handler.
 *
 * Reads `global_config` to decide whether cron is enabled and which users
 * participate, then triggers a push with `trigger='cron'`. Errors are logged
 * but never thrown — the Worker scheduler retries on its own.
 */
export async function runScheduledPush(): Promise<void> {
  try {
    const db = getDb()
    const [config] = await db
      .select()
      .from(globalConfig)
      .where(eq(globalConfig.id, 1))
      .limit(1)
    if (!config) {
      logger.warn('cron 触发但全局配置未初始化，跳过')
      return
    }
    if (!config.cronEnabled) {
      logger.info('cron 已禁用，跳过')
      return
    }
    const userIds = Array.isArray(config.cronUserIds) ? config.cronUserIds : []
    if (userIds.length === 0) {
      logger.warn('cron 已启用但未配置参与用户，跳过')
      return
    }

    const result = await runPush({ trigger: 'cron', userIds })
    logger.info('cron 推送完成', {
      batchId: result.batchId,
      successCount: result.successCount,
      failedCount: result.failedCount,
    })
  } catch (error) {
    logger.error('cron 推送失败', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
