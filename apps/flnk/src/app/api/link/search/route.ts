import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { searchLinks } from '@/lib/data/links'
import { requireSession } from '@/lib/platform/auth'
import { getConfig } from '@/lib/platform/env'

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
  const links = await searchLinks(env, q, { limit }, auth.user.email)
  return NextResponse.json({ links })
}
