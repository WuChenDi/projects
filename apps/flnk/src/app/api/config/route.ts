import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { isConfigured } from '@/lib/analytics/analytics-query'
import { isR2Enabled } from '@/lib/data/r2'
import { requireSession } from '@/lib/platform/auth'

// Feature-availability flags for the dashboard (so it can show/hide R2-gated
// affordances like the OG image uploader).
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  return NextResponse.json({
    r2: isR2Enabled(env),
    analytics: isConfigured(env),
  })
}
