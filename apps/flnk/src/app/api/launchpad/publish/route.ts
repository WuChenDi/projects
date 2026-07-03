import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { publishLaunchpad } from '@/lib/launchpads'
import { PublishLaunchpadSchema } from '@/schemas/launchpad'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const parsed = PublishLaunchpadSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { env } = getCloudflareContext()
  const result = await publishLaunchpad(env, parsed.data.id, parsed.data.status)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ launchpad: result.launchpad })
}
