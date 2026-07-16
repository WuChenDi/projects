import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import {
  AnalyticsNotConfiguredError,
  executeAeSql,
  parseStatsQuery,
  viewsSql,
} from '@/lib/analytics/analytics-query'
import { requireSession } from '@/lib/platform/auth'

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const q = parseStatsQuery(new URL(request.url).searchParams)
  q.ownerKey = auth.user.email
  // Short ranges bucket by hour, longer ones by day.
  const span =
    q.startAt && q.endAt ? q.endAt - q.startAt : Number.POSITIVE_INFINITY
  const interval = span <= TWO_DAYS_MS ? 'hour' : 'day'

  try {
    const rows = await executeAeSql(env, viewsSql(env, q, interval))
    return NextResponse.json({
      configured: true,
      interval,
      views: rows.map((r) => ({
        time: r.time,
        visits: Number(r.visits) || 0,
        visitors: Number(r.visitors) || 0,
      })),
    })
  } catch (error) {
    if (error instanceof AnalyticsNotConfiguredError) {
      return NextResponse.json({ configured: false, interval, views: [] })
    }
    throw error
  }
}
