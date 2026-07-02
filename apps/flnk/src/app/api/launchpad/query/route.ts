import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getLaunchpadById } from '@/lib/launchpads'

// Fetch a single launchpad by id.
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
  return NextResponse.json({ launchpad })
}
