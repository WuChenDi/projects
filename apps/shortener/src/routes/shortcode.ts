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

export const shortCodeRoutes = new Hono<{
  Bindings: CloudflareEnv
  Variables: Variables
}>()

shortCodeRoutes.use('/:shortCode', analyticsMiddleware)
// shortCodeRoutes.use('/:shortCode/*', analyticsMiddleware)

// GET / - Service health check and info
shortCodeRoutes.get('/', async (c) => {
  const requestId = c.get('requestId')
  logger.info(`[${requestId}] Service health check requested`)

  try {
    const db = useDrizzle(c)
    let dbStatus: 'connected' | 'disconnected' = 'disconnected'
    let analyticsStatus: 'available' | 'unavailable' = 'unavailable'

    try {
      // Simple database connectivity test
      await db?.select().from(links).limit(1)
      dbStatus = 'connected'
      logger.debug('Database connectivity test passed')
    } catch (dbError) {
      dbStatus = 'disconnected'
      logger.warn(
        `Database connectivity test failed, ${JSON.stringify({
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        })}`,
      )
    }

    // Check analytics availability
    if (c.env.ANALYTICS) {
      analyticsStatus = 'available'
      logger.debug('Analytics Engine available')
    } else {
      logger.warn('Analytics Engine not available')
    }

    logger.info(
      `Service health check completed, ${JSON.stringify({
        status: 'healthy',
        dbStatus,
        analyticsStatus,
      })}`,
    )

    return c.json<ApiResponse<ServiceHealthResponse>>({
      code: 0,
      message: 'ok',
      data: {
        service: pkg.name,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: pkg.version,
        database: dbStatus,
        analytics: analyticsStatus,
      },
    })
  } catch (error) {
    logger.error(
      `[${requestId}] Error during health check, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      })}`,
    )

    return c.json<ApiResponse<ServiceHealthResponse>>(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: {
          service: pkg.name,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          version: pkg.version,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500,
    )
  }
})

// GET /:shortCode
shortCodeRoutes.get('/:shortCode', async (c) => {
  const shortCode = c.req.param('shortCode')
  const userAgent = c.req.header('user-agent') || ''
  const requestId = c.get('requestId')

  logger.info(
    `[${requestId}] Processing shortcode redirect request: ${shortCode}`,
  )
  logger.debug(`User agent: ${userAgent}`)

  try {
    const db = useDrizzle(c)
    const url = new URL(c.req.url)
    const domain = url.hostname

    logger.debug(`Request domain: ${domain}`)

    // Check for social media crawlers (redirect to OG page)
    const socialCrawlers = [
      'facebookexternalhit',
      'twitterbot',
      'linkedinbot',
      'telegrambot',
      'whatsapp',
      'discordbot',
      'slackbot',
    ]

    if (
      socialCrawlers.some((crawler) =>
        userAgent.toLowerCase().includes(crawler),
      )
    ) {
      logger.info(
        `Social media crawler detected, redirecting to OG page: ${shortCode}`,
      )
      return c.redirect(`/${shortCode}/og`, 302)
    }

    const hash = generateHashFromDomainAndCode(domain, shortCode)
    logger.debug(`Generated hash for lookup: ${hash}`)

    // Caching strategy: Check KV cache first
    const cacheKey = `url:${hash}`
    let urlData: UrlData | null = null

    if (c.env.SHORTENER_KV) {
      try {
        const cached = await c.env.SHORTENER_KV.get(cacheKey, 'json')
        if (cached) {
          urlData = cached as UrlData
          logger.debug(`Cache hit for shortcode: ${shortCode}`)
        } else {
          logger.debug(`Cache miss for shortcode: ${shortCode}`)
        }
      } catch (cacheError) {
        logger.warn(
          `Cache read error, falling back to database, ${JSON.stringify({
            error:
              cacheError instanceof Error
                ? cacheError.message
                : 'Unknown error',
          })}`,
        )
      }
    }

    // If cache miss, query the database
    if (!urlData) {
      urlData =
        (await db
          ?.select()
          .from(links)
          .where(withNotDeleted(links, eq(links.hash, hash)))
          .limit(1)
          .get()) || null

      // If found, check expiration before caching
      if (urlData && c.env.SHORTENER_KV) {
        const isExpired = urlData.expiresAt && Date.now() > urlData.expiresAt
        if (!isExpired) {
          try {
            await c.env.SHORTENER_KV.put(cacheKey, JSON.stringify(urlData), {
              expirationTtl: 3600, // Cache for 1 hour
            })
            logger.debug(`Cached URL data for shortcode: ${shortCode}`)
          } catch (cacheError) {
            logger.warn(
              `Cache write error, ${JSON.stringify({
                error:
                  cacheError instanceof Error
                    ? cacheError.message
                    : 'Unknown error',
              })}`,
            )
          }
        }
      }
    }

    if (!urlData) {
      logger.warn(`Shortcode not found: ${shortCode} (hash: ${hash})`)
      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'Short code not found or expired',
        },
        404,
      )
    }

    // Check expiration
    const isExpired = urlData.expiresAt && Date.now() > urlData.expiresAt
    if (isExpired) {
      logger.warn(
        `Shortcode expired: ${shortCode}, ${JSON.stringify({
          expiresAt: urlData.expiresAt,
          currentTime: Date.now(),
          expired: isExpired,
        })}`,
      )

      // delete cache if expired
      if (c.env.SHORTENER_KV) {
        try {
          await c.env.SHORTENER_KV.delete(cacheKey)
        } catch (cacheError) {
          logger.warn(
            `Cache delete error, ${JSON.stringify({
              error:
                cacheError instanceof Error
                  ? cacheError.message
                  : 'Unknown error',
            })}`,
          )
        }
      }

      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'Short code not found or expired',
        },
        404,
      )
    }

    // Store URL data for analytics middleware
    c.set('urlData', urlData)

    logger.info(`Redirecting shortcode ${shortCode} to: ${urlData.url}`)
    logger.debug(
      `Redirect details: ${JSON.stringify({
        shortCode,
        hash,
        domain,
        targetUrl: urlData.url,
        userId: urlData.userId,
        expiresAt: urlData.expiresAt,
      })}`,
    )

    return c.redirect(urlData.url, 302)
  } catch (error) {
    logger.error(
      `[${requestId}] Error processing shortcode ${shortCode}, ${JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      )}`,
    )
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error'

    return c.json<ApiResponse>(
      {
        code: 500,
        message: errorMessage,
      },
      500,
    )
  }
})

// GET /:shortCode/og
shortCodeRoutes.get('/:shortCode/og', async (c) => {
  const shortCode = c.req.param('shortCode')
  const requestId = c.get('requestId')

  logger.info(
    `[${requestId}] Processing OG page request for shortcode: ${shortCode}`,
  )

  try {
    if (!shortCode || shortCode.trim() === '') {
      logger.warn('OG page requested without valid shortcode')
      return c.json<ApiResponse>(
        {
          code: 400,
          message: 'Short code not provided or invalid',
        },
        400,
      )
    }

    const db = useDrizzle(c)
    const url = new URL(c.req.url)
    const domain = url.hostname
    const hash = generateHashFromDomainAndCode(domain, shortCode)

    logger.debug(`OG page lookup - domain: ${domain}, hash: ${hash}`)

    // Caching strategy: Check OG page cache first
    const ogCacheKey = `og:${hash}`
    let cachedHtml: string | null = null

    if (c.env.SHORTENER_KV) {
      try {
        cachedHtml = await c.env.SHORTENER_KV.get(ogCacheKey)
        if (cachedHtml) {
          logger.debug(`OG page cache hit for shortcode: ${shortCode}`)
          return c.html(cachedHtml)
        }
      } catch (cacheError) {
        logger.warn(
          `OG cache read error, ${JSON.stringify({
            error:
              cacheError instanceof Error
                ? cacheError.message
                : 'Unknown error',
          })}`,
        )
      }
    }

    // Query the database
    const urlData: UrlData | undefined = await db
      ?.select()
      .from(links)
      .where(withNotDeleted(links, eq(links.hash, hash)))
      .get()

    if (!urlData) {
      logger.warn(`OG page - shortcode not found: ${shortCode}`)
      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'Short code not found',
        },
        404,
      )
    }

    if (urlData.expiresAt && Date.now() > urlData.expiresAt) {
      logger.warn(
        `OG page - shortcode expired: ${shortCode}, ${JSON.stringify({
          expiresAt: urlData.expiresAt,
          currentTime: Date.now(),
        })}`,
      )
      return c.json<ApiResponse>(
        {
          code: 404,
          message: 'Short code expired',
        },
        404,
      )
    }

    const { url: targetUrl } = urlData
    logger.info(
      `Serving OG page for shortcode ${shortCode}, target: ${targetUrl}`,
    )

    // Store URL data for analytics middleware (OG page access tracking)
    c.set('urlData', urlData)

    const html = generateOgPageHtml(targetUrl)

    if (c.env.SHORTENER_KV) {
      try {
        await c.env.SHORTENER_KV.put(ogCacheKey, html, {
          expirationTtl: 3600, // Cache for 1 hour
        })
        logger.debug(`Cached OG page for shortcode: ${shortCode}`)
      } catch (cacheError) {
        logger.warn(
          `OG cache write error, ${JSON.stringify({
            error:
              cacheError instanceof Error
                ? cacheError.message
                : 'Unknown error',
          })}`,
        )
      }
    }

    logger.debug(`OG page HTML generated for shortcode: ${shortCode}`)
    return c.html(html)
  } catch (error) {
    logger.error(
      `[${requestId}] Error processing OG page for shortcode ${shortCode}, ${JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      )}`,
    )
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error'

    return c.json<ApiResponse>(
      {
        code: 500,
        message: errorMessage,
      },
      500,
    )
  }
})
