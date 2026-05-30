import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import * as schema from '@/database/schema'
import { getDb } from '@/lib/db'

// Built per-request: on next-on-pages the D1 binding (and process.env vars) are
// only populated inside a request, so the auth instance can't live at module
// top. Cheap enough to construct on each auth call.
export async function getAuth() {
  const db = await getDb()

  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

  return betterAuth({
    appName: 'flox',
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      // No email service wired yet — keep verification off for now.
      requireEmailVerification: false,
    },
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          },
        }
      : undefined,
    plugins: [nextCookies()],
  })
}
