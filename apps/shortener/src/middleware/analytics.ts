import type { Context, MiddlewareHandler } from 'hono'
import { UAParser } from 'ua-parser-js'
import type { AnalyticsData, CloudflareEnv, UrlData, Variables } from '@/types'
import { isBot } from '@/utils'

/**
 * Extract comprehensive analytics data from request context and URL data
 * Processes headers, Cloudflare metadata, and user agent information
 */
export function extractAnalyticsData(
  c: Context,
  urlData: UrlData,
): AnalyticsData {
  const request = c.req
  // @ts-expect-error
  const cf = c.env?.cf || c.req?.cf || {}

  // Parse user agent for device and browser information
  const userAgent = request.header('user-agent') || ''
  const uaParser = new UAParser(userAgent)
  const uaResult = uaParser.getResult()

  // Extract client IP with fallback chain
  const ip =
    request.header('cf-connecting-ip') ||
    request.header('x-forwarded-for') ||
    request.header('x-real-ip') ||
    '0.0.0.0'

  // Process referrer and language information
  const referer = request.header('referer') || ''
  const acceptLanguage = request.header('accept-language') || ''
  const language = acceptLanguage.split(',')[0]?.split('-')[0] || 'en'

  // Format geographic information with country context
  const countryName = cf.country || 'Unknown'
  const regionName = cf.region ? `${cf.region}, ${countryName}` : countryName
  const cityName = cf.city ? `${cf.city}, ${countryName}` : countryName

  // Safely extract referrer hostname
  let refererHostname = 'direct'
  try {
    if (referer && referer !== '') {
      refererHostname = new URL(referer).hostname
    }
  } catch {
    refererHostname = 'direct'
  }

  return {
    // Primary index
    hash: urlData.hash || 'unknown',

    // String data fields (mapped to Analytics Engine blobs)
    linkId: String(urlData.id || 0),
    userId: urlData.userId || 'anonymous',
    shortCode: urlData.shortCode || 'unknown',
    domain: urlData.domain || 'unknown',
    targetUrl: urlData.url || 'unknown',
    userAgent,
    ip,
    referer: refererHostname,
    country: countryName,
    region: regionName,
    city: cityName,
    timezone: cf.timezone || 'UTC',
    language,
    os: uaResult.os?.name || 'Unknown',
    browser: uaResult.browser?.name || 'Unknown',
    browserVersion: uaResult.browser?.version || '0',
    deviceType: uaResult.device?.type || 'desktop',
    deviceModel: uaResult.device?.model || 'Unknown',
    colo: cf.colo || 'Unknown',

    // Numeric data fields (mapped to Analytics Engine doubles)
    latitude: Number(cf.latitude) || 0,
    longitude: Number(cf.longitude) || 0,
    timestamp: Date.now(),
  }
}

/**
 * Write analytics data to Cloudflare Analytics Engine
 */
export async function writeAnalytics(env: CloudflareEnv, data: AnalyticsData) {
  try {
    // Verify Analytics Engine is available
    if (!env.ANALYTICS) {
      logger.warn('Analytics Engine not configured')
      return
    }

    // Filter bot traffic if enabled
    const disableBotAnalytics = env.DISABLE_BOT_ANALYTICS === 'true'
    if (disableBotAnalytics && isBot(data.userAgent)) {
      logger.debug(
        `Bot traffic excluded from analytics, ${JSON.stringify({
          userAgent: data.userAgent,
        })}`,
      )
      return
    }

    // Apply sampling rate to reduce data volume
    const sampleRate = Number(env.ANALYTICS_SAMPLE_RATE || '1.0')
    if (Math.random() > sampleRate) {
      logger.debug(
        `Request sampled out of analytics, ${JSON.stringify({
          sampleRate,
        })}`,
      )
      return
    }

    const safeData: AnalyticsData = {
      hash: data.hash || 'unknown',
      linkId: data.linkId || '0',
      userId: data.userId || 'anonymous',
      shortCode: data.shortCode || 'unknown',
      domain: data.domain || 'unknown',
      targetUrl: data.targetUrl || 'unknown',
      userAgent: data.userAgent || 'unknown',
      ip: data.ip || '0.0.0.0',
      referer: data.referer || 'direct',
      country: data.country || 'Unknown',
      region: data.region || 'Unknown',
      city: data.city || 'Unknown',
      timezone: data.timezone || 'UTC',
      language: data.language || 'en',
      os: data.os || 'Unknown',
      browser: data.browser || 'Unknown',
      browserVersion: data.browserVersion || '0',
      deviceType: data.deviceType || 'desktop',
      deviceModel: data.deviceModel || 'Unknown',
      colo: data.colo || 'Unknown',
      latitude: Number(data.latitude) || 0,
      longitude: Number(data.longitude) || 0,
      timestamp: Number(data.timestamp) || Date.now(),
    }

    // Write to Analytics Engine with structured field mapping
    await env.ANALYTICS.writeDataPoint({
      indexes: [safeData.hash],
      blobs: [
        safeData.linkId, // blob1
        safeData.userId, // blob2
        safeData.shortCode, // blob3
        safeData.domain, // blob4
        safeData.targetUrl, // blob5
        safeData.userAgent, // blob6
        safeData.ip, // blob7
        safeData.referer, // blob8
        safeData.country, // blob9
        safeData.region, // blob10
        safeData.city, // blob11
        safeData.timezone, // blob12
        safeData.language, // blob13
        safeData.os, // blob14
        safeData.browser, // blob15
        safeData.browserVersion, // blob16
        safeData.deviceType, // blob17
        safeData.deviceModel, // blob18
        safeData.colo, // blob19
      ],
      doubles: [
        safeData.latitude, // double1
        safeData.longitude, // double2
        safeData.timestamp, // double3
      ],
    })

    logger.debug(
      `Analytics data written successfully, ${JSON.stringify({
        hash: safeData.hash,
        linkId: safeData.linkId,
        shortCode: safeData.shortCode,
        country: safeData.country,
        browser: safeData.browser,
      })}`,
    )
  } catch (error) {
    logger.error(
      `Failed to write analytics data, ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        hash: data.hash,
        shortCode: data.shortCode,
        stack: error instanceof Error ? error.stack : undefined,
      })}`,
    )
  }
}

/**
 * Analytics middleware for shortcode routes
 * Automatically collects and writes analytics data for successful redirects
 * Non-blocking - analytics failures won't affect the redirect response
 */
export const analyticsMiddleware: MiddlewareHandler<{
  Bindings: CloudflareEnv
  Variables: Variables
}> = async (c, next) => {
  // Track request start time for performance monitoring
  c.set('startTime', Date.now())

  await next()

  // Record analytics only for successful redirects (302 status)
  const urlData = c.get('urlData')
  if (urlData && c.res.status === 302) {
    try {
      const analyticsData = extractAnalyticsData(c, urlData)
      await writeAnalytics(c.env, analyticsData)
    } catch (error) {
      // Analytics errors should not affect the redirect response
      logger.error(
        `Analytics middleware error, ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      )
    }
  }
}
