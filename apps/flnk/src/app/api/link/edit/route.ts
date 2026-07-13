import { NextResponse } from 'next/server'
import { updateLink } from '@/lib/links'
import { withAuth } from '@/lib/with-auth'
import { EditLinkSchema } from '@/schemas/link'

export const PUT = withAuth(EditLinkSchema, async (data, { user, env }) => {
  const result = await updateLink(env, data, user.email)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ link: result.link })
})
