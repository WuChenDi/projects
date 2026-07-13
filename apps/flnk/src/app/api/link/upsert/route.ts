import { NextResponse } from 'next/server'
import { upsertLink } from '@/lib/links'
import { withAuth } from '@/lib/with-auth'
import { UpsertLinkSchema } from '@/schemas/link'

export const POST = withAuth(
  UpsertLinkSchema,
  async (data, { user, request, env }) => {
    const domain = new URL(request.url).hostname
    const result = await upsertLink(env, data, domain, user.email)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }
    return NextResponse.json({ link: result.link })
  },
)
