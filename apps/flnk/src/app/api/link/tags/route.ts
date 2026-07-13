import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { listTags } from '@/lib/data/links'
import { requireSession } from '@/lib/platform/auth'

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const tags = await listTags(env)
  return NextResponse.json({ tags })
}
