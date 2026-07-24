// Custom Worker entry that wraps the opennextjs/cloudflare build output
// (`.open-next/worker.js`) and adds a `scheduled()` handler driven by
// `triggers.crons` in wrangler.jsonc.
//
// Build flow:
//   1. `opennextjs-cloudflare build` produces `.open-next/worker.js` + assets.
//   2. Wrangler bundles this file (esbuild) — it imports the built worker
//      to keep the Next.js fetch surface intact.
//   3. We add `scheduled` here so the cron entry point can call our push
//      runner without touching opennext's generated code.

import type {
  ExecutionContext,
  ExportedHandler,
  ExportedHandlerFetchHandler,
  MessageBatch,
  ScheduledController,
} from '@cloudflare/workers-types'
import { handlePushQueue } from '@/services/push/consumer'
import type { PushQueueMessage } from '@/services/push/runner'
import { runScheduledPush } from '@/services/push/scheduled'
// @ts-expect-error: artifact only exists after `opennextjs-cloudflare build`
import openNextWorker from '../../.open-next/worker.js'

interface NextWorker {
  fetch: ExportedHandlerFetchHandler<CloudflareEnv>
}

const worker = openNextWorker as NextWorker

export default {
  fetch: worker.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: CloudflareEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    // Note: don't try to seed opennext's `__cloudflare-context__` symbol here.
    // opennext defines it as a getter-only property backed by AsyncLocalStorage
    // — assigning to it throws. Instead we forward `env` explicitly so the
    // cron path doesn't depend on `getCloudflareContext()`, and pass `ctx` so
    // each owner's push can run in the background via `ctx.waitUntil`.
    await runScheduledPush(env, ctx)
  },
  async queue(
    batch: MessageBatch<PushQueueMessage>,
    env: CloudflareEnv,
    _ctx: ExecutionContext,
  ): Promise<void> {
    // Drain per-recipient push jobs enqueued by `startPush` (the producer).
    await handlePushQueue(batch, env)
  },
} satisfies ExportedHandler<CloudflareEnv, PushQueueMessage>
