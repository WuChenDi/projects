import { createClient } from '@libsql/client'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { drizzle as drizzleSqlite } from 'drizzle-orm/libsql'
import * as schema from '@/database/schema'

// LibSQL and D1 drivers share the same runtime query-builder API; we expose
// the LibSQL type so callers get a single concrete shape (this avoids the
// projection overload mismatch when the union is used).
export type DB = LibSQLDatabase<typeof schema>

let cachedDb: DB | undefined

export function getDb(): DB {
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
    cachedDb = drizzleD1(binding, { schema }) as unknown as DB
    return cachedDb
  }

  const client = createClient({
    url: process.env.LIBSQL_URL || 'file:./src/database/data.db',
    authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
  })
  cachedDb = drizzleSqlite(client, { schema })
  return cachedDb
}
