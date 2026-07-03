import { getCloudflareContext } from '@opennextjs/cloudflare'
import { extractAccessLog, writeAccessLog } from '@/lib/analytics'
import { TrackLaunchpadSchema } from '@/schemas/launchpad'

// Public click-beacon for launchpad blocks. No auth — a visitor's click on a
// `/m/<slug>` block records a `launchpad_block` engagement. The clicked block id
// rides in the `url` blob (blob2); `type` (blob19) marks the entity kind.
export async function POST(request: Request): Promise<Response> {
  const parsed = TrackLaunchpadSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return new Response(null, { status: 204 })
  }

  const { env, cf, ctx } = getCloudflareContext()
  const { slug, blockId } = parsed.data
  ctx.waitUntil(
    Promise.resolve().then(() =>
      writeAccessLog(
        env,
        extractAccessLog(request, slug, blockId, cf, 'launchpad_block'),
      ),
    ),
  )
  return new Response(null, { status: 204 })
}
