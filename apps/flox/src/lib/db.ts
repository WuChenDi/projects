import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '@/database/schema'

// Common base type — both LibSQLDatabase and DrizzleD1Database extend this,
// so a single `DB` reference accepts either driver.
export type DB = BaseSQLiteDatabase<'async', unknown, typeof schema>

let cachedLibsqlDb: DB | undefined

// flox deploys via @cloudflare/next-on-pages (Edge), so the D1 binding is only
// reachable through `getRequestContext()` inside a request — never at module
// load. Local `next dev` has no binding, so DB_TYPE falls back to libsql.
export async function getDb(): Promise<DB> {
  const dbType = process.env.DB_TYPE || 'libsql'

  if (dbType === 'd1') {
    const { getRequestContext } = await import('@cloudflare/next-on-pages')
    const binding = getRequestContext().env.DB
    if (!binding) {
      throw new Error(
        'D1 binding "DB" not found — set d1_databases in wrangler.jsonc',
      )
    }
    return drizzleD1(binding, { schema })
  }

  if (cachedLibsqlDb) return cachedLibsqlDb

  // Dev-only path. `new Function` hides the import from bundlers so the build
  // never tries to bundle @libsql/* (which fails under pnpm hoisting). In
  // production we always take the D1 branch above, so this never runs there.
  const dynamicImport = new Function('p', 'return import(p)') as <T>(
    p: string,
  ) => Promise<T>
  const [{ createClient }, { drizzle: drizzleSqlite }] = await Promise.all([
    dynamicImport<typeof import('@libsql/client/web')>('@libsql/client/web'),
    dynamicImport<typeof import('drizzle-orm/libsql')>('drizzle-orm/libsql'),
  ])
  const client = createClient({
    url: process.env.LIBSQL_URL || 'file:./src/database/data.db',
    authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
  })
  cachedLibsqlDb = drizzleSqlite(client, { schema })
  return cachedLibsqlDb
}
