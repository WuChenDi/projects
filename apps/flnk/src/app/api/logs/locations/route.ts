import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import {
  AnalyticsNotConfiguredError,
  executeAeSql,
  locationSql,
  parseStatsQuery,
} from '@/lib/analytics/analytics-query'
import { requireSession } from '@/lib/platform/auth'

// Aggregated visit coordinates for the realtime globe. Upstream Sink serves this
// from `/api/logs/locations`; `/api/location` instead returns the caller's own
// geo (see ../../location/route.ts).
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const url = new URL(request.url)
  const q = { ...parseStatsQuery(url.searchParams), ownerKey: auth.user.email }
  const limit = Math.min(
    1000,
    Math.max(1, Number(url.searchParams.get('limit')) || 500),
  )
  try {
    const rows = await executeAeSql(env, locationSql(env, q, limit))
    return NextResponse.json({
      configured: true,
      points: rows.map((r) => ({
        lat: Number(r.lat) || 0,
        lng: Number(r.lng) || 0,
        count: Number(r.count) || 0,
      })),
    })
  } catch (error) {
    if (error instanceof AnalyticsNotConfiguredError) {
      return NextResponse.json({ configured: false, points: [] })
    }
    throw error
  }
}
