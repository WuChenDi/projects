import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { requireSession } from '@/lib/auth'
import { MAX_LINKS, runHealthCheck } from '@/lib/health-check'
import { getLinkById, listLinks } from '@/lib/links'

const BodySchema = z.object({
  ids: z.array(z.string()).optional(),
})

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { env } = getCloudflareContext()
  const { ids } = parsed.data

  // Resolve targets: explicit ids, else all active links (capped).
  let targets: { id: string; slug: string; url: string }[]
  if (ids && ids.length > 0) {
    const found = await Promise.all(ids.map((id) => getLinkById(env, id)))
    targets = found
      .filter((l): l is NonNullable<typeof l> => !!l)
      .map((l) => ({ id: l.id, slug: l.slug, url: l.url }))
  } else {
    const { links } = await listLinks(env, { limit: MAX_LINKS, offset: 0 })
    targets = links.map((l) => ({ id: l.id, slug: l.slug, url: l.url }))
  }

  targets = targets.slice(0, MAX_LINKS)
  const results = await runHealthCheck(env, targets)
  return NextResponse.json({ results })
}
