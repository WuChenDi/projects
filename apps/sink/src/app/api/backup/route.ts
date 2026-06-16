import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSiteToken } from '@/lib/auth'
import { backupToR2 } from '@/lib/backup'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const key = await backupToR2(env)
  if (!key) {
    return NextResponse.json({ error: 'R2 not configured' }, { status: 503 })
  }
  return NextResponse.json({ ok: true, key })
}
