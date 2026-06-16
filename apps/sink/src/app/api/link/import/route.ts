import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSiteToken } from '@/lib/auth'
import { importLinks } from '@/lib/links'
import { ImportDataSchema } from '@/schemas/link'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const parsed = ImportDataSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid import data', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { env } = getCloudflareContext()
  const report = await importLinks(env, parsed.data.links)
  return NextResponse.json(report)
}
