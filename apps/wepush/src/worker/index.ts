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
  ScheduledController,
} from '@cloudflare/workers-types'
import { runScheduledPush } from '@/services/push/scheduled'
// @ts-expect-error: artifact only exists after `opennextjs-cloudflare build`
import openNextWorker from '../../.open-next/worker.js'

interface NextWorker {
  fetch: ExportedHandlerFetchHandler<CloudflareEnv>
}

const cloudflareContextSymbol = Symbol.for('__cloudflare-context__')

function ensureCloudflareContext(env: CloudflareEnv, ctx: ExecutionContext) {
  const g = globalThis as unknown as Record<symbol, unknown>
  if (!g[cloudflareContextSymbol]) {
    g[cloudflareContextSymbol] = { env, ctx, cf: undefined }
  }
}

const worker = openNextWorker as NextWorker

export default {
  fetch: worker.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: CloudflareEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    ensureCloudflareContext(env, ctx)
    await runScheduledPush()
  },
} satisfies ExportedHandler<CloudflareEnv>
