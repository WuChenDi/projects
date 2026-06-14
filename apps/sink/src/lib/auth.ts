import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/env'

// Extract a Bearer token from an Authorization header.
export function extractBearer(request: Request): string | null {
  const auth = request.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/u)
  return match ? match[1].trim() : null
}

// Compare against the configured SITE_TOKEN. Fails CLOSED in production when no
// token is configured (a missing token must never open the gate in a deploy);
// in non-production the gate stays open as a single-tenant local-dev convenience.
export function isValidSiteToken(token: string | null): boolean {
  const siteToken = getConfig().siteToken
  if (!siteToken) return process.env.NODE_ENV !== 'production'
  return token !== null && token === siteToken
}

type AuthResult = { ok: true } | { ok: false; response: NextResponse }

// Bearer gate for /api/* route handlers and the dashboard verify endpoint.
export function requireSiteToken(request: Request): AuthResult {
  const token = extractBearer(request)
  if (!isValidSiteToken(token)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid or missing site token' },
        { status: 401 },
      ),
    }
  }
  return { ok: true }
}
