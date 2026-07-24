import { and, eq, lt } from 'drizzle-orm'
import { pushBatches } from '@/database/schema'
import { getDb } from '@/lib/db'

// A 'running' batch older than this is treated as dead-lettered / never-finalized
// (every message exhausted its retries without landing the terminal transition,
// or the consumer crashed mid-batch). The reaper closes it out from its current
// counts. Kept above the producer's STALE_RUN_MS guard so a batch is only reaped
// once it can no longer be finishing normally.
const STALE_BATCH_MS = 30 * 60 * 1000

/**
 * Safety-net sweep for batches stuck in `running` past the stale threshold — a
 * consumer crash or a fully dead-lettered batch leaves no last-message
 * transition to finalize them. Runs from the daily cron.
 *
 * Deliberately GLOBAL (not owner-scoped): it's a cross-tenant backstop for
 * batches no consumer will ever finalize, and only ever reads/writes the
 * `pushBatches` status/time/counter columns — no recipient data is touched.
 *
 * Each terminal status is computed from the batch's CURRENT counters and mirrors
 * the consumer's decision exactly. The UPDATE is guarded by `status = 'running'`
 * so it's idempotent and never clobbers a batch the consumer just finalized.
 */
export async function reapStaleBatches(env: CloudflareEnv): Promise<number> {
  const db = await getDb(env)
  const threshold = new Date(Date.now() - STALE_BATCH_MS)

  const stale = await db
    .select({
      id: pushBatches.id,
      successCount: pushBatches.successCount,
      failedCount: pushBatches.failedCount,
    })
    .from(pushBatches)
    .where(
      and(
        eq(pushBatches.status, 'running'),
        eq(pushBatches.isDeleted, 0),
        lt(pushBatches.startedAt, threshold),
      ),
    )

  for (const batch of stale) {
    // Match consumer.ts terminal-status logic; both counts 0 -> 'failed'.
    const finalStatus =
      batch.successCount === 0
        ? 'failed'
        : batch.failedCount === 0
          ? 'success'
          : 'partial'
    // Guarded on status='running' so a batch the consumer just finalized is left
    // untouched (idempotent). Between the select and this update the window is
    // small; an occasional no-op here is harmless.
    await db
      .update(pushBatches)
      .set({ status: finalStatus, finishedAt: new Date() })
      .where(
        and(eq(pushBatches.id, batch.id), eq(pushBatches.status, 'running')),
      )
  }

  if (stale.length > 0) {
    console.info('已回收滞留推送批次', { reaped: stale.length })
  }
  return stale.length
}
