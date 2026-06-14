import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSiteToken } from '@/lib/auth'
import { getConfig } from '@/lib/env'
import type { SortKey } from '@/lib/links'
import { listLinks } from '@/lib/links'

const SORTS: readonly SortKey[] = ['createdAt', 'updatedAt', 'expiresAt']

export async function GET(request: Request): Promise<NextResponse> {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const url = new URL(request.url)
  const maxLimit = getConfig(env).listQueryLimit
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number(url.searchParams.get('limit')) || 20),
  )
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)
  const sortParam = url.searchParams.get('sort') as SortKey | null
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : 'createdAt'

  const result = await listLinks(env, { limit, offset, sort })
  return NextResponse.json(result)
}
