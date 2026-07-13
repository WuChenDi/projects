import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { listCreators } from '@/lib/data/links'
import { requireSession } from '@/lib/platform/auth'

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const creators = await listCreators(env)
  return NextResponse.json({ creators })
}
