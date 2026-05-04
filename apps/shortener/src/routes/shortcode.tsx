import { eq, sql } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { Hono } from 'hono'
import pkg from '@/../package.json'
import type * as schema from '@/database/schema'
import { links } from '@/database/schema'
import {
  getDrizzle,
  isExpired,
  notDeleted,
  useDrizzle,
  withNotDeleted,
} from '@/lib'
import { analyticsMiddleware } from '@/middleware/analytics'
import { HomePage } from '@/pages/HomePage'
import type {
  ApiResponse,
  CloudflareEnv,
  ServiceHealthResponse,
  UrlData,
  Variables,
} from '@/types'
import {
  generateHashFromDomainAndCode,
  generateOgPageHtml,
  getAIConfig,
} from '@/utils'

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
const TOTAL_LINKS_CACHE_TTL_SECONDS = 60
const TOTAL_LINKS_CACHE_KEY = 'stats:total-links'

export const shortCodeRoutes = new Hono<{
  Bindings: CloudflareEnv
  Variables: Variables
}>()

shortCodeRoutes.use('/:shortCode', analyticsMiddleware)

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

/**
 * Count of active (non-deleted) links, KV-cached for one minute so the
 * landing page doesn't pay D1 latency on every hit.
 */
async function getTotalActiveLinks(env: CloudflareEnv): Promise<number | null> {
  if (env.SHORTENER_KV) {
    try {
      const cached = await env.SHORTENER_KV.get<{ count: number }>(
        TOTAL_LINKS_CACHE_KEY,
        'json',
      )
      if (cached && typeof cached.count === 'number') return cached.count
    } catch (error) {
      logger.warn(
        `KV read error for ${TOTAL_LINKS_CACHE_KEY}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  try {
    // The DrizzleDb union (D1 + LibSQL) confuses TS overload resolution on
    // `.select({ ...fields })`, so cast to the LibSQL variant; runtime call
    // is identical on both drivers.
    const db = getDrizzle(env) as LibSQLDatabase<typeof schema>
    const row = await db
      .select({ count: sql<number>`count(*)` })
      .from(links)
      .where(notDeleted(links))
      .get()
    const total = Number(row?.count ?? 0)
    if (env.SHORTENER_KV) {
      try {
        await env.SHORTENER_KV.put(
          TOTAL_LINKS_CACHE_KEY,
          JSON.stringify({ count: total }),
          { expirationTtl: TOTAL_LINKS_CACHE_TTL_SECONDS },
        )
      } catch (error) {
        logger.warn(
          `KV write error for ${TOTAL_LINKS_CACHE_KEY}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }
    return total
  } catch (error) {
    logger.warn(
      `Total link count query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
    return null
  }
}

// GET / - Landing page
shortCodeRoutes.get('/', async (c) => {
  const requestId = c.get('requestId')
  logger.info(`[${requestId}] Landing page requested`)

  const db = useDrizzle(c)
  let database: 'connected' | 'disconnected' = 'disconnected'
  let totalLinks: number | null = null
  try {
    await db.select().from(links).limit(1)
    database = 'connected'
    totalLinks = await getTotalActiveLinks(c.env)
  } catch (error) {
    logger.warn(
      `Database not reachable for landing page: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  return c.html(
    <HomePage
      url={new URL(c.req.url).origin}
      version={pkg.version}
      totalLinks={totalLinks}
      database={database}
      analytics={c.env.ANALYTICS ? 'available' : 'unavailable'}
      ai={getAIConfig(c.env).ENABLE_AI_SLUG ? 'enabled' : 'disabled'}
    />,
  )
})

// GET /health - JSON service health check
shortCodeRoutes.get('/health', async (c) => {
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
