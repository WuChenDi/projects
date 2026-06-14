import { NextResponse } from 'next/server'
import { requireSiteToken } from '@/lib/auth'

// Validates the Bearer site token. The dashboard login page calls this with the
// token the user enters; on success the token is stored client-side and sent on
// every subsequent /api/* request.
export function GET(request: Request): NextResponse {
  const auth = requireSiteToken(request)
  if (!auth.ok) return auth.response
  return NextResponse.json({ ok: true })
}
