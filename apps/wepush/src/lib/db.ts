import { getCloudflareContext } from '@opennextjs/cloudflare'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '@/database/schema'

// Common base type — both LibSQLDatabase and DrizzleD1Database extend this.
// Using the base lets a single `DB` reference accept either driver while
// keeping every standard query-builder method (select with projection,
// leftJoin, $count, etc.) intact. Driver-specific extras (e.g. `.batch`) are
// intentionally not on this type — callers must narrow if they need them.
export type DB = BaseSQLiteDatabase<'async', unknown, typeof schema>

let cachedDb: DB | undefined

export async function getDb(): Promise<DB> {
  if (cachedDb) return cachedDb

  const dbType = process.env.DB_TYPE || 'libsql'

  if (dbType === 'd1') {
    const ctx = getCloudflareContext()
    const binding = ctx.env.DB
    if (!binding) {
      throw new Error(
        'D1 binding "DB" not found — set d1_databases in wrangler.jsonc',
      )
    }
    cachedDb = drizzleD1(binding, { schema })
    return cachedDb
  }

  // Dev-only path. `new Function` hides the import from bundlers so OpenNext's
  // esbuild never tries to bundle @libsql/* (which fails under pnpm hoisting
  // because @libsql/hrana-client can't find its sibling @libsql/isomorphic-ws).
  // In production we always take the D1 branch above, so this is never run.
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
  cachedDb = drizzleSqlite(client, { schema })
  return cachedDb
}
