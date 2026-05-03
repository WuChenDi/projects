import type { Context, MiddlewareHandler } from 'hono'
import { UAParser } from 'ua-parser-js'
import type { AnalyticsData, CloudflareEnv, UrlData, Variables } from '@/types'
import { isBot } from '@/utils'

/**
 * Extract analytics data from request context and URL data.
 * Pulls headers, Cloudflare-specific request metadata (`request.cf`), and
 * derives device/browser info from the user agent.
 */
export function extractAnalyticsData(
  c: Context,
  urlData: UrlData,
): AnalyticsData {
  const userAgent = c.req.header('user-agent') || ''
  const uaResult = new UAParser(userAgent).getResult()

  // Cloudflare attaches its enrichment data on the underlying Request as `cf`.
  const cf =
    (c.req.raw as Request & { cf?: IncomingRequestCfProperties }).cf ??
    ({} as Partial<IncomingRequestCfProperties>)

  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    '0.0.0.0'

  const referer = c.req.header('referer') || ''
  const language =
    (c.req.header('accept-language') || '').split(',')[0]?.split('-')[0] || 'en'

  const country = cf.country || 'Unknown'
  const region = cf.region ? `${cf.region}, ${country}` : country
  const city = cf.city ? `${cf.city}, ${country}` : country

  let refererHostname = 'direct'
  if (referer) {
    try {
      refererHostname = new URL(referer).hostname
    } catch {
      // keep 'direct' for unparseable referrers
    }
  }

  return {
    hash: urlData.hash || 'unknown',
    linkId: String(urlData.id || 0),
    userId: urlData.userId || 'anonymous',
    shortCode: urlData.shortCode || 'unknown',
    domain: urlData.domain || 'unknown',
    targetUrl: urlData.url || 'unknown',
    userAgent,
    ip,
    referer: refererHostname,
    country,
    region,
    city,
    timezone: cf.timezone || 'UTC',
    language,
    os: uaResult.os?.name || 'Unknown',
    browser: uaResult.browser?.name || 'Unknown',
    browserVersion: uaResult.browser?.version || '0',
    deviceType: uaResult.device?.type || 'desktop',
    deviceModel: uaResult.device?.model || 'Unknown',
    colo: cf.colo || 'Unknown',
    latitude: Number(cf.latitude) || 0,
    longitude: Number(cf.longitude) || 0,
    timestamp: Date.now(),
  }
}

/** Write a single analytics event to the Analytics Engine. */
export async function writeAnalytics(env: CloudflareEnv, data: AnalyticsData) {
  if (!env.ANALYTICS) {
    logger.warn('Analytics Engine not configured')
    return
  }

  if (env.DISABLE_BOT_ANALYTICS === 'true' && isBot(data.userAgent)) {
    logger.debug(
      `Bot traffic excluded from analytics, userAgent: ${data.userAgent}`,
    )
    return
  }

  const sampleRate = Number(env.ANALYTICS_SAMPLE_RATE || '1.0')
  if (Math.random() > sampleRate) {
    logger.debug(`Request sampled out of analytics, sampleRate: ${sampleRate}`)
    return
  }

  try {
    await env.ANALYTICS.writeDataPoint({
      indexes: [data.hash],
      blobs: [
        data.linkId,
        data.userId,
        data.shortCode,
        data.domain,
        data.targetUrl,
        data.userAgent,
        data.ip,
        data.referer,
        data.country,
        data.region,
        data.city,
        data.timezone,
        data.language,
        data.os,
        data.browser,
        data.browserVersion,
        data.deviceType,
        data.deviceModel,
        data.colo,
      ],
      doubles: [data.latitude, data.longitude, data.timestamp],
    })

    logger.debug(
      `Analytics data written, ${JSON.stringify({
        hash: data.hash,
        shortCode: data.shortCode,
        country: data.country,
      })}`,
    )
  } catch (error) {
    logger.error(
      `Failed to write analytics data, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        hash: data.hash,
      })}`,
    )
  }
}

/**
 * Records analytics for successful redirects (HTTP 302).
 * Failures here never affect the response.
 */
export const analyticsMiddleware: MiddlewareHandler<{
  Bindings: CloudflareEnv
  Variables: Variables
}> = async (c, next) => {
  c.set('startTime', Date.now())
  await next()

  const urlData = c.get('urlData')
  if (urlData && c.res.status === 302) {
    try {
      await writeAnalytics(c.env, extractAnalyticsData(c, urlData))
    } catch (error) {
      logger.error(
        `Analytics middleware error, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
    }
  }
}
