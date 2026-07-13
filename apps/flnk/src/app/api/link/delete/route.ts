import { NextResponse } from 'next/server'
import { deleteLink } from '@/lib/links'
import { withAuth } from '@/lib/with-auth'
import { DeleteLinkSchema } from '@/schemas/link'

export const POST = withAuth(DeleteLinkSchema, async (data, { env }) => {
  const result = await deleteLink(env, data.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
})
