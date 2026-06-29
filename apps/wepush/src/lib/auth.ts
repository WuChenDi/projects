import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import * as schema from '@/database/schema'
import { userConfig } from '@/database/schema'
import { getDb } from '@/lib/db'

// Built per-request: on Cloudflare Workers the D1 binding (and process.env vars)
// are only populated inside a request, so the auth instance can't live at module
// top. Cheap enough to construct on each auth call.
export async function getAuth() {
  const db = await getDb()

  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
  const githubEnabled =
    !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET

  return betterAuth({
    appName: 'wepush',
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    // On Cloudflare Workers the real client IP is forwarded in `CF-Connecting-IP`;
    // better-auth defaults to `X-Forwarded-For` (absent here), so rate limiting
    // would otherwise fall back to a single shared per-path bucket.
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
    },
    // Same email across providers == the same person, hence the same tenant.
    // Trusting google/github forces email-based linking even when a provider
    // omits the verified flag, so signing in with Google then GitHub (same
    // email) resolves to one `user.id` (one `ownerId`, one data set) instead of
    // silently creating a second tenant. Both providers' primary emails are
    // platform-verified, so this is safe here.
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'github'],
      },
    },
    // Social login only — no email/password. First social sign-in auto-creates
    // the user (login == registration).
    socialProviders: {
      ...(googleEnabled && {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      }),
      ...(githubEnabled && {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID as string,
          clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
      }),
    },
    plugins: [nextCookies()],
  })
}

export interface SessionUser {
  id: string
  email: string
  name: string
}

type SessionResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse }

// Session gate for console-only `/api/*` route handlers. A valid better-auth
// session cookie is required; the signed-in user is returned so every query can
// be scoped to its tenant (`ownerId === user.id`).
export async function requireSession(request: Request): Promise<SessionResult> {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      ),
    }
  }
  return { ok: true, user: session.user as SessionUser }
}

type OwnerResult =
  | { ok: true; ownerId: string }
  | { ok: false; response: NextResponse }

// Owner gate for the push API (`/api/push/*`, batch retry). Accepts either a
// console session cookie OR a `Authorization: Bearer <token>` whose token maps
// to a tenant's `userConfig.pushApiToken` — so external callers (curl, cron)
// are scoped to the owner that owns the token. Returns the resolved `ownerId`.
export async function requireOwner(request: Request): Promise<OwnerResult> {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: request.headers })
  if (session) return { ok: true, ownerId: session.user.id }

  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/u)
  if (match) {
    const token = match[1].trim()
    if (token) {
      const db = await getDb()
      const rows = await db
        .select({ ownerId: userConfig.ownerId })
        .from(userConfig)
        .where(eq(userConfig.pushApiToken, token))
        .limit(1)
      if (rows[0]) return { ok: true, ownerId: rows[0].ownerId }
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid bearer token' },
        { status: 401 },
      ),
    }
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    ),
  }
}
