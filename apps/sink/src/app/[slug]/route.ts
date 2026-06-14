import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { NextRequest } from 'next/server'
import type { Link } from '@/database/schema'
import { extractAccessLog, writeAccessLog } from '@/lib/analytics'
import { getConfig } from '@/lib/env'
import { verifyLinkPassword } from '@/lib/hash'
import { ogPageHtml, passwordFormHtml, unsafeWarningHtml } from '@/lib/html'
import { isExpired, purgeLink, resolveLink } from '@/lib/links'
import { logger } from '@/lib/logger'
import { isSocialCrawler, resolveDestination } from '@/lib/redirect'
import { isReservedSlug } from '@/lib/reserve-slug'

const NO_STORE = { 'cache-control': 'no-store' } as const

type RouteContext = { params: Promise<{ slug: string }> }

function notFound(env: CloudflareEnv): Response {
  const { notFoundRedirect } = getConfig(env)
  if (notFoundRedirect) {
    return Response.redirect(notFoundRedirect, 302)
  }
  return new Response('Not found', { status: 404, headers: NO_STORE })
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...NO_STORE },
  })
}

// Build the final redirect + fire the access log.
function redirectTo(
  request: Request,
  env: CloudflareEnv,
  cf: IncomingRequestCfProperties | undefined,
  ctx: { waitUntil: (p: Promise<unknown>) => void },
  link: Link,
  slug: string,
): Response {
  const ua = request.headers.get('user-agent') || ''
  const dest = resolveDestination(link, {
    ua,
    country: cf?.country,
    search: new URL(request.url).search,
    env,
  })

  ctx.waitUntil(
    Promise.resolve().then(() =>
      writeAccessLog(env, extractAccessLog(request, slug, dest, cf)),
    ),
  )

  const status = getConfig(env).redirectStatusCode
  return new Response(null, {
    status,
    headers: { location: dest, ...NO_STORE },
  })
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { slug } = await params
  const { env, cf, ctx } = getCloudflareContext()

  if (isReservedSlug(slug)) return notFound(env)

  const domain = new URL(request.url).hostname
  const link = await resolveLink(env, domain, slug)

  if (!link) {
    logger.info(`Slug not found: ${slug} (domain=${domain})`)
    return notFound(env)
  }

  if (isExpired(link.expiresAt)) {
    logger.info(`Slug expired: ${slug}`)
    await purgeLink(env, domain, slug)
    return notFound(env)
  }

  const ua = request.headers.get('user-agent') || ''

  // Password gate takes priority — it must run before the OG/cloaking branch,
  // otherwise a social crawler would receive the destination via `og:url` and
  // defeat the gate. The POST handler verifies the submission.
  if (link.config.passwordHash) {
    return htmlResponse(passwordFormHtml(slug))
  }

  // Social crawlers (and cloaked links) get the OG preview page.
  if (link.config.cloaking || isSocialCrawler(ua)) {
    return htmlResponse(
      ogPageHtml(link.url, link.config, { redirect: !link.config.cloaking }),
    )
  }

  // Unsafe interstitial — require an explicit click-through.
  if (link.config.unsafe) {
    return htmlResponse(unsafeWarningHtml(link.url))
  }

  return redirectTo(request, env, cf, ctx, link, slug)
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { slug } = await params
  const { env, cf, ctx } = getCloudflareContext()

  if (isReservedSlug(slug)) return notFound(env)

  const domain = new URL(request.url).hostname
  const link = await resolveLink(env, domain, slug)

  if (!link || isExpired(link.expiresAt)) return notFound(env)

  // Only the password flow uses POST.
  if (!link.config.passwordHash) {
    return redirectTo(request, env, cf, ctx, link, slug)
  }

  const form = await request.formData()
  const password = String(form.get('password') || '')
  const ok = await verifyLinkPassword(password, link.config.passwordHash)

  if (!ok) {
    logger.info(`Incorrect password for slug: ${slug}`)
    return htmlResponse(passwordFormHtml(slug, true), 401)
  }

  return redirectTo(request, env, cf, ctx, link, slug)
}
