import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'

// Returns the caller's own geo from Cloudflare's request properties (matches
// upstream Sink's `/api/location`). The aggregated globe feed lives at
// `/api/logs/locations`.
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  const { cf } = getCloudflareContext()
  return NextResponse.json({
    latitude: cf?.latitude,
    longitude: cf?.longitude,
  })
}
