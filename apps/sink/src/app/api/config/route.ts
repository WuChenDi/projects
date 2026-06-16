import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { isConfigured } from '@/lib/analytics-query'
import { requireSiteToken } from '@/lib/auth'
import { isR2Enabled } from '@/lib/r2'

// Feature-availability flags for the dashboard (so it can show/hide R2-gated
// affordances like the OG image uploader).
export function GET(request: Request): NextResponse {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response

  const { env } = getCloudflareContext()
  return NextResponse.json({
    r2: isR2Enabled(env),
    analytics: isConfigured(env),
  })
}
