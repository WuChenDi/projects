import { createClient } from '@libsql/client/web'
import { createGetDb } from './core'

export * from './core'
export * from './utils'

/**
 * Build the app's `getDb(env)` bound to its schema, using the web libsql
 * client (`@libsql/client/web`). Pure fetch/ws (no native bindings), so it
 * bundles under OpenNext's esbuild and runs on the Workers runtime — use this
 * for Next.js (OpenNext) apps. Remote Turso only; no `file:` support.
 */
export function defineDb<TSchema extends Record<string, unknown>>(
  schema: TSchema,
) {
  return createGetDb(schema, createClient)
}
