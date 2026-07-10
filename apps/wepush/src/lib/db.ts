import type { Db } from '@cdlab/db/web'
import { defineDb } from '@cdlab/db/web'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import * as schema from '@/database/schema'

// Both LibSQLDatabase and DrizzleD1Database extend this base, so a single `DB`
// reference accepts either driver. Driver-specific extras (e.g. `.batch`) are
// not on this type — callers must narrow.
export type DB = Db<typeof schema>

const getDbFromEnv = defineDb(schema)

// `env` lets callers (e.g. the `scheduled()` handler) inject the worker env
// directly. The cron path can't use `getCloudflareContext()` because opennext
// only installs the context inside its fetch wrapper, and `process.env` is
// likewise only populated on first fetch — so a cron-first cold start would
// otherwise see no bindings and no DB_TYPE.
export async function getDb(env?: CloudflareEnv): Promise<DB> {
  const e = env ?? getCloudflareContext().env
  return getDbFromEnv({
    DB_TYPE: e.DB_TYPE ?? process.env.DB_TYPE,
    DB: e.DB,
    LIBSQL_URL: e.LIBSQL_URL ?? process.env.LIBSQL_URL,
    LIBSQL_AUTH_TOKEN: e.LIBSQL_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN,
  })
}
