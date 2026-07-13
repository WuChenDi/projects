import { NextResponse } from 'next/server'
import { updateLaunchpad } from '@/lib/launchpads'
import { withAuth } from '@/lib/with-auth'
import { EditLaunchpadSchema } from '@/schemas/launchpad'

export const PUT = withAuth(EditLaunchpadSchema, async (data, { env }) => {
  const result = await updateLaunchpad(env, data)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ launchpad: result.launchpad })
})
