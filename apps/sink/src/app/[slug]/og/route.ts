import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { NextRequest } from 'next/server'
import { ogPageHtml } from '@/lib/html'
import { isExpired, resolveLink } from '@/lib/links'
import { isReservedSlug } from '@/lib/reserve-slug'

type RouteContext = { params: Promise<{ slug: string }> }

// Dedicated OG/social-preview endpoint. Renders the link's OG metadata as HTML.
export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { slug } = await params
  const { env } = getCloudflareContext()

  if (isReservedSlug(slug)) {
    return new Response('Not found', { status: 404 })
  }

  const domain = new URL(request.url).hostname
  const link = await resolveLink(env, domain, slug)

  if (!link || isExpired(link.expiresAt)) {
    return new Response('Not found', { status: 404 })
  }

  // Never expose the destination of a password-protected link via OG metadata.
  if (link.config.passwordHash) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(ogPageHtml(link.url, link.config, { redirect: false }), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
