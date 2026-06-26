import { UAParser } from 'ua-parser-js'
import { getConfig } from '@/lib/env'
import { logger } from '@/lib/logger'

const BOT_PATTERNS = [
  'bot',
  'crawler',
  'spider',
  'scraper',
  'facebook',
  'twitter',
  'linkedin',
  'telegram',
  'whatsapp',
  'discord',
  'slack',
  'googlebot',
  'bingbot',
  'yahoobot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
] as const

export function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern))
}

interface AccessLog {
  slug: string
  url: string
  ua: string
  ip: string
  referer: string
  country: string
  region: string
  city: string
  timezone: string
  language: string
  os: string
  browser: string
  browserType: string
  device: string
  deviceType: string
  colo: string
  domain: string
  latitude: number
  longitude: number
}

// Build the access-log record from the incoming request + Cloudflare metadata.
export function extractAccessLog(
  request: Request,
  slug: string,
  url: string,
  cf: IncomingRequestCfProperties | undefined,
): AccessLog {
  const ua = request.headers.get('user-agent') || ''
  const uaResult = new UAParser(ua).getResult()
  const props = cf ?? ({} as Partial<IncomingRequestCfProperties>)

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'

  const referer = request.headers.get('referer') || ''
  let refererHostname = 'direct'
  if (referer) {
    try {
      refererHostname = new URL(referer).hostname
    } catch {
      // keep 'direct' for unparseable referrers
    }
  }

  const language =
    (request.headers.get('accept-language') || '')
      .split(',')[0]
      ?.split('-')[0] || 'en'

  return {
    slug,
    url,
    ua,
    ip,
    referer: refererHostname,
    country: props.country || 'Unknown',
    region: props.region || 'Unknown',
    city: props.city || 'Unknown',
    timezone: props.timezone || 'UTC',
    language,
    os: uaResult.os?.name || 'Unknown',
    browser: uaResult.browser?.name || 'Unknown',
    browserType: uaResult.browser?.type || 'browser',
    device: uaResult.device?.model || 'Unknown',
    deviceType: uaResult.device?.type || 'desktop',
    colo: props.colo || 'Unknown',
    domain: new URL(request.url).hostname,
    latitude: Number(props.latitude) || 0,
    longitude: Number(props.longitude) || 0,
  }
}

// Write a single access-log data point to Analytics Engine. Failures never
// affect the redirect — they are logged and swallowed.
export function writeAccessLog(env: CloudflareEnv, data: AccessLog): void {
  if (!env.ANALYTICS) {
    logger.warn('Analytics Engine not configured — skipping access log')
    return
  }
  if (getConfig(env).disableBotAccessLog && isBot(data.ua)) {
    logger.debug('Bot traffic excluded from access log', data.ua)
    return
  }

  try {
    env.ANALYTICS.writeDataPoint({
      indexes: [data.slug],
      blobs: [
        data.slug,
        data.url,
        data.ua,
        data.ip,
        data.referer,
        data.country,
        data.region,
        data.city,
        data.timezone,
        data.language,
        data.os,
        data.browser,
        data.browserType,
        data.device,
        data.deviceType,
        data.colo,
        data.domain,
      ],
      doubles: [data.latitude, data.longitude],
    })
  } catch (error) {
    logger.error(
      'Failed to write access log',
      error instanceof Error ? error.message : error,
    )
  }
}
