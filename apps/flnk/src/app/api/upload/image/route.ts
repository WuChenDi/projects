import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { newId } from '@/lib/genid'
import { getR2, IMAGE_ALLOWED_TYPES, IMAGE_MAX_SIZE } from '@/lib/r2'
import { validateSlug } from '@/lib/slug'

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  const r2 = getR2(env)
  if (!r2) {
    return NextResponse.json({ error: 'R2 not configured' }, { status: 503 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const slug = String(form?.get('slug') || '')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }
  if (slug && validateSlug(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }
  if (!IMAGE_ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type' },
      { status: 400 },
    )
  }
  if (file.size > IMAGE_MAX_SIZE) {
    return NextResponse.json(
      { error: 'File too large (max 5MB)' },
      { status: 400 },
    )
  }

  const ext = file.type.split('/')[1]
  const key = `og/${slug || 'shared'}/${newId()}.${ext}`
  await r2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  return NextResponse.json({ url: `/api/asset/${key}` }, { status: 201 })
}
