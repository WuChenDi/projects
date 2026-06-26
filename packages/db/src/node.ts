import { createClient } from '@libsql/client'
import { createGetDb } from './core'

export * from './core'
export * from './utils'

/**
 * Build the app's `getDb(env)` bound to its schema, using the Node libsql
 * client (`@libsql/client`). Supports `file:` local SQLite — use this for
 * plain-wrangler (Hono) workers and Node test runners.
 */
export function defineDb<TSchema extends Record<string, unknown>>(
  schema: TSchema,
) {
  return createGetDb(schema, createClient)
}
