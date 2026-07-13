import { NextResponse } from 'next/server'
import { setLinkTags } from '@/lib/links'
import { withAuth } from '@/lib/with-auth'
import { SetTagsSchema } from '@/schemas/link'

export const POST = withAuth(SetTagsSchema, async (data, { user, env }) => {
  const { id, tags } = data
  const ok = await setLinkTags(env, id, tags, user.email)
  if (!ok) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
})
