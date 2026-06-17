import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import {
  AnalyticsNotConfiguredError,
  executeAeSql,
  heatmapSql,
  parseStatsQuery,
} from '@/lib/analytics-query'
import { requireSession } from '@/lib/auth'

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const q = parseStatsQuery(new URL(request.url).searchParams)
  try {
    const rows = await executeAeSql(env, heatmapSql(env, q))
    return NextResponse.json({
      configured: true,
      heatmap: rows.map((r) => ({
        weekday: Number(r.weekday) || 0,
        hour: Number(r.hour) || 0,
        visits: Number(r.visits) || 0,
        visitors: Number(r.visitors) || 0,
      })),
    })
  } catch (error) {
    if (error instanceof AnalyticsNotConfiguredError) {
      return NextResponse.json({ configured: false, heatmap: [] })
    }
    throw error
  }
}
