import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { bulkTagLinks } from '@/lib/links'
import { BulkTagSchema } from '@/schemas/link'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const parsed = BulkTagSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { env } = getCloudflareContext()
  const { ids, tag, op } = parsed.data
  const updated = await bulkTagLinks(env, ids, tag, op, auth.user.email)
  return NextResponse.json({ updated })
}
