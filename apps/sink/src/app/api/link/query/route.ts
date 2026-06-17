import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getLinkById, resolveLink } from '@/lib/links'

// Fetch a single link by id, or by (slug, domain) when id is absent.
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const slug = url.searchParams.get('slug')
  const domain = url.searchParams.get('domain') || url.hostname

  const link = id
    ? await getLinkById(env, id)
    : slug
      ? await resolveLink(env, domain, slug)
      : null

  if (!link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
  return NextResponse.json({ link })
}
