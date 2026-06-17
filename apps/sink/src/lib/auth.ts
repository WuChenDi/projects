import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { NextResponse } from 'next/server'
import * as schema from '@/database/schema'
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
    appName: 'sink',
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
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

type AuthResult = { ok: true } | { ok: false; response: NextResponse }

// Session gate for /api/* route handlers. Replaces the old SITE_TOKEN Bearer
// check — a valid better-auth session cookie is required.
export async function requireSession(request: Request): Promise<AuthResult> {
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
  return { ok: true }
}
