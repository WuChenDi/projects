import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { requireSession } from '@/lib/auth'
import { MAX_LINKS, runHealthCheck } from '@/lib/health-check'
import { getLinkRowsByIds } from '@/lib/links'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

// One batch of links to check, with a per-link timeout. The client drives
// batching (so it can show progress and stop), so each request carries an
// explicit, bounded set of ids.
const BodySchema = z.object({
  ids: z.array(z.string()).min(1).max(MAX_LINKS),
  timeout: z.coerce.number().int().min(1).max(30).optional(),
})

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { env } = getCloudflareContext()
  const identity = auth.user.id || clientIp(request)
  if (await checkRateLimit(env, 'linkcheck', identity, 10, 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { ids, timeout } = parsed.data

  // Re-resolve the ids to their stored links server-side — never trust a
  // client-supplied destination URL for the server-side fetch (SSRF surface).
  const found = await getLinkRowsByIds(env, ids)
  const targets = found.map((l) => ({ id: l.id, slug: l.slug, url: l.url }))

  const results = await runHealthCheck(
    env,
    targets,
    timeout ? timeout * 1000 : undefined,
  )
  return NextResponse.json({ results })
}
