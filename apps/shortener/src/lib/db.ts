import { createClient } from '@libsql/client'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { drizzle as drizzleSqlite } from 'drizzle-orm/libsql'
import type { Context } from 'hono'
import * as schema from '@/database/schema'
import type { CloudflareEnv } from '@/types'

export type DrizzleDb =
  | LibSQLDatabase<typeof schema>
  | DrizzleD1Database<typeof schema>

let cached: { key: string; db: DrizzleDb } | null = null

export function getDrizzle(env: CloudflareEnv): DrizzleDb {
  const dbType = env.DB_TYPE || 'libsql'

  // Cache key: D1 binding is stable per isolate; libsql is keyed on its URL
  const key =
    dbType === 'd1'
      ? 'd1'
      : `libsql:${env.LIBSQL_URL || 'file:./src/database/data.db'}`

  if (cached && cached.key === key) {
    return cached.db
  }

  let db: DrizzleDb
  switch (dbType) {
    case 'd1': {
      if (!env.DB) {
        throw new Error('D1 database binding (DB) not found in env')
      }
      db = drizzleD1(env.DB, { schema })
      break
    }
    case 'libsql': {
      const client = createClient({
        url: env.LIBSQL_URL || 'file:./src/database/data.db',
        authToken: env.LIBSQL_AUTH_TOKEN,
      })
      db = drizzleSqlite(client, { schema })
      break
    }
    default: {
      throw new Error(`Unsupported DB_TYPE: ${dbType}`)
    }
  }

  cached = { key, db }
  return db
}

export function useDrizzle<E extends { Bindings: CloudflareEnv }>(
  c: Context<E>,
): DrizzleDb {
  return getDrizzle(c.env)
}
