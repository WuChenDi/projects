import { verifyPasswordFn } from '@cdlab996/utils'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { NextRequest } from 'next/server'
import type { Link } from '@/database/schema'
import { extractAccessLog, writeAccessLog } from '@/lib/analytics'
import { getConfig } from '@/lib/env'
import { ogPageHtml, passwordFormHtml, unsafeWarningHtml } from '@/lib/html'
import {
  isExpired,
  purgeLink,
  resolveLink,
  visitLimitReached,
} from '@/lib/links'
import { logger } from '@/lib/logger'
import {
  isSocialCrawler,
  resolveDestination,
  resolveRedirectLocale,
} from '@/lib/redirect'
import { isReservedSlug } from '@/lib/reserve-slug'

const NO_STORE = { 'cache-control': 'no-store' } as const

type RouteContext = { params: Promise<{ slug: string }> }

function notFound(request: Request, env: CloudflareEnv): Response {
  const { notFoundRedirect } = getConfig(env)
  if (notFoundRedirect) {
    // Resolve against the request origin so a relative path (e.g. `/404`) is
    // accepted — Response.redirect() requires an absolute URL and would throw.
    return Response.redirect(
      new URL(notFoundRedirect, request.url).toString(),
      302,
    )
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
async function redirectTo(
  request: Request,
  env: CloudflareEnv,
  cf: IncomingRequestCfProperties | undefined,
  ctx: { waitUntil: (p: Promise<unknown>) => void },
  link: Link,
  slug: string,
  // When the redirect follows a form POST (password / unsafe confirm) we must
  // emit 303 See Other so the browser follows it with GET — otherwise the
  // configured 307/308 status preserves the method and re-POSTs to the external
  // destination, which answers 405.
  seeOther = false,
): Promise<Response> {
  // Click-limit expiry: over the maxVisits cap → treat like a time-expired link
  // (purge cache + serve not-found) before redirecting. Increments the counter
  // on the side-effect path when still under the cap.
  if (await visitLimitReached(env, link, ctx)) {
    logger.info(`Slug visit limit reached: ${slug}`)
    await purgeLink(env, new URL(request.url).hostname, slug)
    return notFound(request, env)
  }

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

  const status = seeOther ? 303 : getConfig(env).redirectStatusCode
  return new Response(null, {
    status,
    headers: { location: dest, ...NO_STORE },
  })
}

// Post-gate resolution shared by browser and programmatic (header-password)
// paths: cloaking serves the OG/cloaking page, social crawlers get the OG
// preview only when the link carries OG metadata, an unsafe link shows the
// confirm interstitial (unless already cleared), otherwise we redirect.
async function afterGate(
  request: NextRequest,
  env: CloudflareEnv,
  cf: IncomingRequestCfProperties | undefined,
  ctx: { waitUntil: (p: Promise<unknown>) => void },
  link: Link,
  slug: string,
  ua: string,
  opts: { unsafeCleared: boolean; password?: string; seeOther?: boolean },
): Promise<Response> {
  if (link.config.cloaking) {
    return htmlResponse(ogPageHtml(link.url, link.config, { redirect: false }))
  }

  // A crawler only gets the OG HTML when there is something to preview;
  // otherwise it falls through to a normal redirect (matches upstream).
  const hasOg = Boolean(link.config.title || link.config.image)
  if (isSocialCrawler(ua) && hasOg) {
    return htmlResponse(ogPageHtml(link.url, link.config, { redirect: true }))
  }

  if (link.config.unsafe && !opts.unsafeCleared) {
    return htmlResponse(
      unsafeWarningHtml(slug, link.url, {
        locale: resolveRedirectLocale(request),
        password: opts.password,
      }),
    )
  }

  return redirectTo(request, env, cf, ctx, link, slug, opts.seeOther)
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { slug } = await params
  const { env, cf, ctx } = getCloudflareContext()

  if (isReservedSlug(slug)) return notFound(request, env)

  const domain = new URL(request.url).hostname
  const link = await resolveLink(env, domain, slug)

  if (!link) {
    logger.info(`Slug not found: ${slug} (domain=${domain})`)
    return notFound(request, env)
  }

  if (isExpired(link.expiresAt)) {
    logger.info(`Slug expired: ${slug}`)
    await purgeLink(env, domain, slug)
    return notFound(request, env)
  }

  if (link.config.disabled) {
    logger.info(`Slug disabled: ${slug}`)
    return notFound(request, env)
  }

  const ua = request.headers.get('user-agent') || ''

  // Password gate takes priority — it must run before the OG/cloaking branch,
  // otherwise a social crawler would receive the destination via `og:url` and
  // defeat the gate.
  if (link.config.passwordHash) {
    // Programmatic clients can pass the password (and unsafe confirmation) as
    // headers instead of the HTML form; failures return 403, not the form.
    const headerPassword = request.headers.get('x-link-password')
    if (headerPassword === null) {
      return htmlResponse(
        passwordFormHtml(slug, false, resolveRedirectLocale(request)),
      )
    }
    const ok = await verifyPasswordFn(link.config.passwordHash, headerPassword)
    if (!ok) {
      logger.info(`Incorrect x-link-password for slug: ${slug}`)
      return new Response('Incorrect password', {
        status: 403,
        headers: NO_STORE,
      })
    }
    if (
      link.config.unsafe &&
      request.headers.get('x-link-confirm') !== 'true'
    ) {
      return new Response(
        'Unsafe link: set the x-link-confirm: true header to proceed',
        { status: 403, headers: NO_STORE },
      )
    }
    return afterGate(request, env, cf, ctx, link, slug, ua, {
      unsafeCleared: true,
    })
  }

  return afterGate(request, env, cf, ctx, link, slug, ua, {
    unsafeCleared: false,
  })
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { slug } = await params
  const { env, cf, ctx } = getCloudflareContext()

  if (isReservedSlug(slug)) return notFound(request, env)

  const domain = new URL(request.url).hostname
  const link = await resolveLink(env, domain, slug)

  if (!link || isExpired(link.expiresAt) || link.config.disabled)
    return notFound(request, env)

  const ua = request.headers.get('user-agent') || ''
  const form = await request.formData()
  const confirmed = String(form.get('confirm') || '') === 'true'

  if (link.config.passwordHash) {
    const password = String(form.get('password') || '')
    const ok = await verifyPasswordFn(link.config.passwordHash, password)

    if (!ok) {
      logger.info(`Incorrect password for slug: ${slug}`)
      return htmlResponse(
        passwordFormHtml(slug, true, resolveRedirectLocale(request)),
        401,
      )
    }

    // Password verified — an unsafe link still needs an explicit confirmation,
    // chained from the same submission (the password is re-carried).
    if (link.config.unsafe && !confirmed) {
      return htmlResponse(
        unsafeWarningHtml(slug, link.url, {
          locale: resolveRedirectLocale(request),
          password,
        }),
      )
    }

    return afterGate(request, env, cf, ctx, link, slug, ua, {
      unsafeCleared: true,
      seeOther: true,
    })
  }

  // No password — only the unsafe interstitial uses POST.
  return afterGate(request, env, cf, ctx, link, slug, ua, {
    unsafeCleared: confirmed,
    seeOther: true,
  })
}
