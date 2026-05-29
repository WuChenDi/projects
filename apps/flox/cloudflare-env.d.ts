/// <reference types="@cloudflare/workers-types" />

// Bindings/vars available through `getRequestContext().env` on next-on-pages.
interface CloudflareEnv {
  DB: D1Database
  DB_TYPE?: string
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_URL?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  LIBSQL_URL?: string
  LIBSQL_AUTH_TOKEN?: string
}

// @cloudflare/next-on-pages ships no types for its root export, so declare the
// only symbol we use here.
declare module '@cloudflare/next-on-pages' {
  export function getRequestContext(): {
    env: CloudflareEnv
    cf: IncomingRequestCfProperties
    ctx: ExecutionContext
  }
}
