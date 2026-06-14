import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSiteToken } from '@/lib/auth'
import { deleteLink } from '@/lib/links'
import { DeleteLinkSchema } from '@/schemas/link'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const parsed = DeleteLinkSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { env } = getCloudflareContext()
  const result = await deleteLink(env, parsed.data.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
