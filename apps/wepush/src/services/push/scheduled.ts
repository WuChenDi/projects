import type { ExecutionContext } from '@cloudflare/workers-types'
import { eq } from 'drizzle-orm'
import { userConfig } from '@/database/schema'
import { getDb } from '@/lib/db'
import { startPush } from './runner'

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
export async function runScheduledPush(
  env: CloudflareEnv,
  ctx: ExecutionContext,
): Promise<void> {
  try {
    const db = await getDb(env)
    const configs = await db
      .select()
      .from(userConfig)
      .where(eq(userConfig.cronEnabled, true))

    if (configs.length === 0) {
      console.info('cron 触发但无启用定时推送的租户，跳过')
      return
    }

    // Fire each owner's push in the background via `startPush` (backed by
    // `ctx.waitUntil`) so owners run concurrently under this invocation's
    // budget instead of serially — later tenants can no longer be dropped.
    const waitUntil = ctx.waitUntil.bind(ctx)
    for (const config of configs) {
      const userIds = Array.isArray(config.cronUserIds)
        ? config.cronUserIds
        : []
      if (userIds.length === 0) {
        console.warn('cron 已启用但未配置参与用户，跳过', {
          ownerId: config.ownerId,
        })
        continue
      }

      try {
        const result = await startPush({
          ownerId: config.ownerId,
          trigger: 'cron',
          userIds,
          env,
          waitUntil,
        })
        console.info('cron 推送已开始', {
          ownerId: config.ownerId,
          batchId: result.batchId,
          alreadyRunning: result.alreadyRunning ?? false,
        })
      } catch (error) {
        console.error('cron 推送失败', {
          ownerId: config.ownerId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } catch (error) {
    console.error('cron 调度失败', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
