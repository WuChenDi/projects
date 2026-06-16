import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { generateAiOg } from '@/lib/ai-og'
import { requireSiteToken } from '@/lib/auth'

const QuerySchema = z.object({
  url: z.string().url(),
  locale: z.string().max(35).optional(),
})

export async function GET(request: Request): Promise<NextResponse> {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    url: url.searchParams.get('url'),
    locale: url.searchParams.get('locale') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const { env } = getCloudflareContext()
  const result = await generateAiOg(env, parsed.data.url, parsed.data.locale)
  return NextResponse.json(result)
}
