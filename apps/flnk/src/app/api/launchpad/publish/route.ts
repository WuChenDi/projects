import { NextResponse } from 'next/server'
import { publishLaunchpad } from '@/lib/launchpads'
import { withAuth } from '@/lib/with-auth'
import { PublishLaunchpadSchema } from '@/schemas/launchpad'

export const POST = withAuth(PublishLaunchpadSchema, async (data, { env }) => {
  const result = await publishLaunchpad(env, data.id, data.status)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ launchpad: result.launchpad })
})
