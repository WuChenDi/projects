import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { setLinkTags } from '@/lib/links'
import { SetTagsSchema } from '@/schemas/link'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const parsed = SetTagsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { env } = getCloudflareContext()
  const { id, tags } = parsed.data
  const ok = await setLinkTags(env, id, tags, auth.user.email)
  if (!ok) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
