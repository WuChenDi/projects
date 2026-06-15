import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import {
  AnalyticsNotConfiguredError,
  eventsSql,
  executeAeSql,
  parseStatsQuery,
} from '@/lib/analytics-query'
import { requireSiteToken } from '@/lib/auth'

export async function GET(request: Request): Promise<NextResponse> {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const url = new URL(request.url)
  const q = parseStatsQuery(url.searchParams)
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit')) || 50),
  )
  try {
    const rows = await executeAeSql(env, eventsSql(env, q, limit))
    return NextResponse.json({
      configured: true,
      events: rows.map((r) => ({
        slug: r.slug,
        country: r.country,
        city: r.city,
        os: r.os,
        browser: r.browser,
        deviceType: r.deviceType,
        timestamp: r.timestamp,
      })),
    })
  } catch (error) {
    if (error instanceof AnalyticsNotConfiguredError) {
      return NextResponse.json({ configured: false, events: [] })
    }
    throw error
  }
}
