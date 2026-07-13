import { NextResponse } from 'next/server'
import { deleteLaunchpad } from '@/lib/launchpads'
import { withAuth } from '@/lib/with-auth'
import { DeleteLaunchpadSchema } from '@/schemas/launchpad'

export const POST = withAuth(DeleteLaunchpadSchema, async (data, { env }) => {
  const result = await deleteLaunchpad(env, data.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
})
