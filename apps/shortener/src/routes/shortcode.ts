import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import pkg from '@/../package.json'
import { links } from '@/database/schema'
import { useDrizzle, withNotDeleted } from '@/lib'
import { analyticsMiddleware } from '@/middleware/analytics'
import type {
  ApiResponse,
  CloudflareEnv,
  ServiceHealthResponse,
  UrlData,
  Variables,
} from '@/types'
import { generateHashFromDomainAndCode, generateOgPageHtml } from '@/utils'

const SOCIAL_CRAWLERS = [
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'telegrambot',
  'whatsapp',
  'discordbot',
  'slackbot',
] as const

const URL_CACHE_TTL_SECONDS = 60 * 60 // 1 hour

export const shortCodeRoutes = new Hono<{
  Bindings: CloudflareEnv
  Variables: Variables
}>()

shortCodeRoutes.use('/:shortCode', analyticsMiddleware)

function isExpired(expiresAt: number | null | undefined): boolean {
  return expiresAt != null && Date.now() > expiresAt
}

async function readUrlCache(
  env: CloudflareEnv,
  hash: string,
): Promise<UrlData | null> {
  if (!env.SHORTENER_KV) return null
  try {
    return (await env.SHORTENER_KV.get<UrlData>(`url:${hash}`, 'json')) ?? null
  } catch (error) {
    logger.warn(
      `KV read error for url:${hash}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
    return null
  }
}

async function writeUrlCache(env: CloudflareEnv, hash: string, data: UrlData) {
  if (!env.SHORTENER_KV) return
  try {
    await env.SHORTENER_KV.put(`url:${hash}`, JSON.stringify(data), {
      expirationTtl: URL_CACHE_TTL_SECONDS,
    })
  } catch (error) {
    logger.warn(
      `KV write error for url:${hash}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

async function deleteUrlCache(env: CloudflareEnv, hash: string) {
  if (!env.SHORTENER_KV) return
  try {
    await env.SHORTENER_KV.delete(`url:${hash}`)
  } catch (error) {
    logger.warn(
      `KV delete error for url:${hash}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

// GET / - Service health check
shortCodeRoutes.get('/', async (c) => {
  const requestId = c.get('requestId')
  logger.info(`[${requestId}] Service health check requested`)

  const db = useDrizzle(c)
  let database: ServiceHealthResponse['database'] = 'disconnected'
  try {
    await db.select().from(links).limit(1)
    database = 'connected'
  } catch (error) {
    logger.warn(
      `Database connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  return c.json<ApiResponse<ServiceHealthResponse>>({
    code: 0,
    message: 'ok',
    data: {
      service: pkg.name,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: pkg.version,
      database,
      analytics: c.env.ANALYTICS ? 'available' : 'unavailable',
    },
  })
})

// GET /:shortCode
shortCodeRoutes.get('/:shortCode', async (c) => {
  const shortCode = c.req.param('shortCode')
  const userAgent = c.req.header('user-agent') || ''
  const requestId = c.get('requestId')
  const domain = new URL(c.req.url).hostname
  const hash = generateHashFromDomainAndCode(domain, shortCode)

  logger.info(
    `[${requestId}] Shortcode redirect: ${shortCode} (hash=${hash}, domain=${domain})`,
  )

  // Social-media crawlers see the OG page so they can render previews.
  const ua = userAgent.toLowerCase()
  if (SOCIAL_CRAWLERS.some((bot) => ua.includes(bot))) {
    logger.info(`Social crawler detected, redirecting to OG page: ${shortCode}`)
    return c.redirect(`/${shortCode}/og`, 302)
  }

  let urlData = await readUrlCache(c.env, hash)
  if (!urlData) {
    urlData =
      (await useDrizzle(c)
        .select()
        .from(links)
        .where(withNotDeleted(links, eq(links.hash, hash)))
        .limit(1)
        .get()) ?? null

    if (urlData && !isExpired(urlData.expiresAt)) {
      await writeUrlCache(c.env, hash, urlData)
    }
  }

  if (!urlData) {
    return c.json<ApiResponse>(
      { code: 404, message: 'Short code not found or expired' },
      404,
    )
  }

  if (isExpired(urlData.expiresAt)) {
    logger.warn(
      `Shortcode expired: ${shortCode} (expiresAt=${urlData.expiresAt})`,
    )
    await deleteUrlCache(c.env, hash)
    return c.json<ApiResponse>(
      { code: 404, message: 'Short code not found or expired' },
      404,
    )
  }

  // Make data available to the analytics middleware.
  c.set('urlData', urlData)
  logger.info(`Redirecting ${shortCode} -> ${urlData.url}`)
  return c.redirect(urlData.url, 302)
})

// GET /:shortCode/og
shortCodeRoutes.get('/:shortCode/og', async (c) => {
  const shortCode = c.req.param('shortCode')
  const requestId = c.get('requestId')

  if (!shortCode.trim()) {
    return c.json<ApiResponse>(
      { code: 400, message: 'Short code not provided or invalid' },
      400,
    )
  }

  const domain = new URL(c.req.url).hostname
  const hash = generateHashFromDomainAndCode(domain, shortCode)
  logger.info(
    `[${requestId}] OG page request: ${shortCode} (hash=${hash}, domain=${domain})`,
  )

  const ogCacheKey = `og:${hash}`
  if (c.env.SHORTENER_KV) {
    try {
      const cachedHtml = await c.env.SHORTENER_KV.get(ogCacheKey)
      if (cachedHtml) {
        return c.html(cachedHtml)
      }
    } catch (error) {
      logger.warn(
        `OG cache read error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  const urlData = await useDrizzle(c)
    .select()
    .from(links)
    .where(withNotDeleted(links, eq(links.hash, hash)))
    .get()

  if (!urlData) {
    return c.json<ApiResponse>(
      { code: 404, message: 'Short code not found' },
      404,
    )
  }
  if (isExpired(urlData.expiresAt)) {
    return c.json<ApiResponse>(
      { code: 404, message: 'Short code expired' },
      404,
    )
  }

  // Make data available to the analytics middleware.
  c.set('urlData', urlData)

  const html = generateOgPageHtml(urlData.url)
  if (c.env.SHORTENER_KV) {
    try {
      await c.env.SHORTENER_KV.put(ogCacheKey, html, {
        expirationTtl: URL_CACHE_TTL_SECONDS,
      })
    } catch (error) {
      logger.warn(
        `OG cache write error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  return c.html(html)
})
