import { NextResponse } from 'next/server'
import { bulkTagLinks } from '@/lib/links'
import { withAuth } from '@/lib/with-auth'
import { BulkTagSchema } from '@/schemas/link'

export const POST = withAuth(BulkTagSchema, async (data, { user, env }) => {
  const { ids, tag, op } = data
  const updated = await bulkTagLinks(env, ids, tag, op, user.email)
  return NextResponse.json({ updated })
})
