import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { upsertLaunchpad } from '@/lib/launchpads'
import { UpsertLaunchpadSchema } from '@/schemas/launchpad'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const parsed = UpsertLaunchpadSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { env } = getCloudflareContext()
  const result = await upsertLaunchpad(env, parsed.data, auth.user.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ launchpad: result.launchpad })
}
