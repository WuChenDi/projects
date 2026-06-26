import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getConfig } from '@/lib/env'
import { searchLinks } from '@/lib/links'

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ links: [] })

  const maxLimit = getConfig(env).listQueryLimit
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number(url.searchParams.get('limit')) || 20),
  )
  const links = await searchLinks(env, q, { limit })
  return NextResponse.json({ links })
}
