import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getConfig } from '@/lib/env'
import type { LinkStatus, SortKey } from '@/lib/links'
import { listLinks } from '@/lib/links'

const SORTS: readonly SortKey[] = ['createdAt', 'updatedAt', 'expiresAt']
const STATUSES: readonly LinkStatus[] = ['active', 'disabled', 'expired']

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const url = new URL(request.url)
  const sp = url.searchParams
  const maxLimit = getConfig(env).listQueryLimit
  const limit = Math.min(maxLimit, Math.max(1, Number(sp.get('limit')) || 20))
  const offset = Math.max(0, Number(sp.get('offset')) || 0)
  const sortParam = sp.get('sort') as SortKey | null
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : 'createdAt'
  const statusParam = sp.get('status') as LinkStatus | null
  const status =
    statusParam && STATUSES.includes(statusParam) ? statusParam : undefined
  const createdBy = sp.get('createdBy')?.trim() || undefined
  const startAt = Number(sp.get('startAt')) || undefined
  const endAt = Number(sp.get('endAt')) || undefined

  const result = await listLinks(env, {
    limit,
    offset,
    sort,
    status,
    createdBy,
    startAt,
    endAt,
  })
  return NextResponse.json(result)
}
