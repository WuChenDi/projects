import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  AnalyticsNotConfiguredError,
  accessExportSql,
  executeAeSql,
  parseStatsQuery,
} from '@/lib/analytics-query'
import { requireSession } from '@/lib/auth'
import { generateCsv } from '@/lib/csv'

export async function GET(request: Request): Promise<Response> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const q = parseStatsQuery(new URL(request.url).searchParams)

  let rows: Record<string, string>[] = []
  try {
    rows = await executeAeSql(env, accessExportSql(env, q))
  } catch (error) {
    if (!(error instanceof AnalyticsNotConfiguredError)) throw error
  }

  const csv = generateCsv(
    ['slug', 'url', 'viewers', 'views', 'referers'],
    rows.map((r) => [r.slug, r.url, r.viewers, r.views, r.referers]),
  )

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="flnk-access-${Date.now()}.csv"`,
      'cache-control': 'no-store',
    },
  })
}
