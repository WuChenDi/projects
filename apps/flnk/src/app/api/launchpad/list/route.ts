import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import type { LaunchpadStatus } from '@/database/schema'
import { requireSession } from '@/lib/auth'
import { getConfig } from '@/lib/env'
import type { SortKey } from '@/lib/launchpads'
import { listLaunchpads } from '@/lib/launchpads'

const SORTS: readonly SortKey[] = ['createdAt', 'updatedAt', 'expiresAt']
const STATUSES: readonly LaunchpadStatus[] = ['draft', 'published']

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const sp = new URL(request.url).searchParams
  const maxLimit = getConfig(env).listQueryLimit
  const limit = Math.min(maxLimit, Math.max(1, Number(sp.get('limit')) || 20))
  const offset = Math.max(0, Number(sp.get('offset')) || 0)
  const sortParam = sp.get('sort') as SortKey | null
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : 'createdAt'
  const statusParam = sp.get('status') as LaunchpadStatus | null
  const status =
    statusParam && STATUSES.includes(statusParam) ? statusParam : undefined

  const result = await listLaunchpads(
    env,
    { limit, offset, sort, status },
    auth.user,
  )
  return NextResponse.json(result)
}
