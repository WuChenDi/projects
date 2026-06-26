import type { Client, Config } from '@libsql/client'
import type { AnyD1Database } from 'drizzle-orm/d1'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'

// Runtime-agnostic minimal env shape. Each app adapts its own source
// (Hono `c.env`, OpenNext injected env / `getCloudflareContext()`, `process.env`)
// into this before calling `getDb`.
export interface DbEnv {
  // 'd1' | 'libsql' — defaults to 'libsql' when unset.
  DB_TYPE?: string
  // D1 binding (only needed for DB_TYPE=d1).
  DB?: AnyD1Database
  LIBSQL_URL?: string
  LIBSQL_AUTH_TOKEN?: string
}

// Both DrizzleD1Database and LibSQLDatabase are subtypes of this base, so a
// single `Db` reference accepts either driver while keeping every standard
// query-builder method intact. Driver-specific extras (e.g. `.batch`) are not
// on this type — callers must narrow if they need them.
export type Db<TSchema extends Record<string, unknown>> = BaseSQLiteDatabase<
  'async',
  unknown,
  TSchema
>

// Injected by the `./node` / `./web` entry — the only place the libsql client
// entry differs (node supports `file:` local SQLite; web is pure fetch/ws and
// bundles under OpenNext's esbuild).
export type CreateLibsqlClient = (config: Config) => Client

const DEFAULT_LIBSQL_URL = 'file:./src/database/data.db'

export function createGetDb<TSchema extends Record<string, unknown>>(
  schema: TSchema,
  createLibsqlClient: CreateLibsqlClient,
): (env: DbEnv) => Db<TSchema> {
  // Closure-scoped cache: one per `defineDb(schema)` call, i.e. one per app.
  let cached: { key: string; db: Db<TSchema> } | null = null

  return function getDb(env: DbEnv): Db<TSchema> {
    const dbType = env.DB_TYPE || 'libsql'

    // D1 binding is stable per isolate; libsql is keyed on its URL so a changed
    // URL rebuilds the client.
    const key =
      dbType === 'd1' ? 'd1' : `libsql:${env.LIBSQL_URL || DEFAULT_LIBSQL_URL}`

    if (cached && cached.key === key) return cached.db

    let db: Db<TSchema>
    switch (dbType) {
      case 'd1': {
        if (!env.DB) {
          throw new Error('D1 binding "DB" not found in env')
        }
        db = drizzleD1(env.DB, { schema }) as unknown as Db<TSchema>
        break
      }
      case 'libsql': {
        const client = createLibsqlClient({
          url: env.LIBSQL_URL || DEFAULT_LIBSQL_URL,
          authToken: env.LIBSQL_AUTH_TOKEN,
        })
        db = drizzleLibsql(client, { schema }) as unknown as Db<TSchema>
        break
      }
      default:
        throw new Error(`Unsupported DB_TYPE: ${dbType}`)
    }

    cached = { key, db }
    return db
  }
}
