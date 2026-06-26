import { defineDb } from '@cdlab996/db/node'
import type { Context } from 'hono'
import * as schema from '@/database/schema'
import type { CloudflareEnv } from '@/types'

// Re-export the shared factory, types and query helpers so `@/lib` keeps
// surfacing `notDeleted`, `withNotDeleted`, `softDelete`, etc.
export * from '@cdlab996/db/node'

const getDb = defineDb(schema)

// Get a Drizzle instance in Hono routes. Driver + connection config come from
// the worker env (`c.env`), selected by `DB_TYPE` ('libsql' default | 'd1').
export function useDrizzle(c: Context<{ Bindings: CloudflareEnv }>) {
  return getDb({
    DB_TYPE: c.env.DB_TYPE,
    DB: c.env.DB,
    LIBSQL_URL: c.env.LIBSQL_URL,
    LIBSQL_AUTH_TOKEN: c.env.LIBSQL_AUTH_TOKEN,
  })
}
