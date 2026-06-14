import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSiteToken } from '@/lib/auth'
import { createLink } from '@/lib/links'
import { CreateLinkSchema } from '@/schemas/link'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const parsed = CreateLinkSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { env } = getCloudflareContext()
  const domain = new URL(request.url).hostname
  const result = await createLink(env, parsed.data, domain)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ link: result.link }, { status: 201 })
}
