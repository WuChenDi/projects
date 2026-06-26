import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import {
  AnalyticsNotConfiguredError,
  countersSql,
  executeAeSql,
  parseStatsQuery,
} from '@/lib/analytics-query'
import { requireSession } from '@/lib/auth'

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const q = parseStatsQuery(new URL(request.url).searchParams)
  try {
    const rows = await executeAeSql(env, countersSql(env, q))
    const r = rows[0] ?? {}
    return NextResponse.json({
      configured: true,
      visits: Number(r.visits) || 0,
      visitors: Number(r.visitors) || 0,
      referers: Number(r.referers) || 0,
    })
  } catch (error) {
    if (error instanceof AnalyticsNotConfiguredError) {
      return NextResponse.json({
        configured: false,
        visits: 0,
        visitors: 0,
        referers: 0,
      })
    }
    throw error
  }
}
