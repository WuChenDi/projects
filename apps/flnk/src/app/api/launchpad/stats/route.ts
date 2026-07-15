import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import {
  AnalyticsNotConfiguredError,
  executeAeSql,
  launchpadBlockStatsSql,
  launchpadStatsSql,
  launchpadViewsSql,
  parseStatsQuery,
} from '@/lib/analytics/analytics-query'
import { getLaunchpadById } from '@/lib/data/launchpads'
import { requireSession } from '@/lib/platform/auth'

// Per-launchpad view + engagement totals for the dashboard Track tab.
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { env } = getCloudflareContext()
  const launchpad = await getLaunchpadById(env, id)
  if (!launchpad) {
    return NextResponse.json({ error: 'Launchpad not found' }, { status: 404 })
  }

  const q = parseStatsQuery(new URL(request.url).searchParams)
  q.filters.slug = launchpad.slug
  try {
    const [totals, blocks, series] = await Promise.all([
      executeAeSql(env, launchpadStatsSql(env, q)),
      executeAeSql<{ blockId: string; count: string }>(
        env,
        launchpadBlockStatsSql(env, q, 100),
      ),
      executeAeSql<{ time: string; views: string }>(
        env,
        launchpadViewsSql(env, q, 'day'),
      ),
    ])
    const r = totals[0] ?? {}
    return NextResponse.json({
      configured: true,
      views: Number(r.views) || 0,
      engagements: Number(r.engagements) || 0,
      blocks: blocks.map((b) => ({
        blockId: b.blockId,
        count: Number(b.count) || 0,
      })),
      series: series.map((s) => ({
        time: s.time,
        views: Number(s.views) || 0,
      })),
    })
  } catch (error) {
    if (error instanceof AnalyticsNotConfiguredError) {
      return NextResponse.json({
        configured: false,
        views: 0,
        engagements: 0,
        blocks: [],
        series: [],
      })
    }
    throw error
  }
}
