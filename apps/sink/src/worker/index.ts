// Custom Worker entry that wraps the opennextjs/cloudflare build output
// (`.open-next/worker.js`) and adds a `scheduled()` handler driven by
// `triggers.crons` in wrangler.jsonc.
//
// Build flow:
//   1. `opennextjs-cloudflare build` produces `.open-next/worker.js` + assets.
//   2. Wrangler bundles this file (esbuild) — it imports the built worker
//      to keep the Next.js fetch surface intact.
//   3. We add `scheduled` here so the cron entry point can run the cleanup
//      task without touching opennext's generated code.

import type {
  ExecutionContext,
  ExportedHandler,
  ExportedHandlerFetchHandler,
  ScheduledController,
} from '@cloudflare/workers-types'
import { cleanupExpiredLinks } from '@/lib/cleanup'
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
    _ctx: ExecutionContext,
  ): Promise<void> {
    // Forward `env` explicitly — opennext only installs the Cloudflare context
    // inside its fetch wrapper, so the cron path can't rely on
    // `getCloudflareContext()`.
    await cleanupExpiredLinks(env)
  },
} satisfies ExportedHandler<CloudflareEnv>
