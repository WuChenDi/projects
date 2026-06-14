import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { generateAiSlug } from '@/lib/ai-slug'
import { requireSiteToken } from '@/lib/auth'

const QuerySchema = z.object({ url: z.string().url() })

export async function GET(request: Request): Promise<NextResponse> {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const parsed = QuerySchema.safeParse({ url: url.searchParams.get('url') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const { env } = getCloudflareContext()
  const result = await generateAiSlug(env, parsed.data.url)
  return NextResponse.json(result)
}
