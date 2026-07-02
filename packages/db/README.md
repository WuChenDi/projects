# @cdlab996/db

Shared Drizzle DB factory (D1 / LibSQL, dual-driver) and query helpers — the single source of truth for DB wiring across `dropply-api`, `flnk`, and `wepush`; each app's `src/lib/db.ts` is a thin adapter over this package instead of a hand-rolled `DatabaseManager` / `getDb` copy.

## Install / Usage

```jsonc
// package.json
{
  "dependencies": {
    "@cdlab996/db": "workspace:*"
  }
}
```

Pick the entry by the app's bundler — it is **not** auto-selected:

```ts
// plain-wrangler Hono worker (dropply-api) or a Node test runner
import { defineDb } from '@cdlab996/db/node'

// Next.js / OpenNext app (flnk, wepush)
import { defineDb } from '@cdlab996/db/web'
```

Bind the factory to the app's schema once, then call the returned `getDb(env)` per request:

```ts
import type { Db } from '@cdlab996/db/web'
import { defineDb } from '@cdlab996/db/web'
import * as schema from '@/database/schema'

export type DB = Db<typeof schema>

const getDbFromEnv = defineDb(schema)

export async function getDb(env: CloudflareEnv): Promise<DB> {
  return getDbFromEnv({
    DB_TYPE: env.DB_TYPE,
    DB: env.DB,
    LIBSQL_URL: env.LIBSQL_URL,
    LIBSQL_AUTH_TOKEN: env.LIBSQL_AUTH_TOKEN,
  })
}
```

## API / Exports

| Entry | Client | Use for |
| --- | --- | --- |
| `@cdlab996/db/node` | `@libsql/client` (Node) — supports `file:` local SQLite | Plain-wrangler Hono workers (`dropply-api`) and Node test runners |
| `@cdlab996/db/web` | `@libsql/client/web` — pure fetch/ws, bundles under OpenNext's esbuild | Next.js / OpenNext apps (`flnk`, `wepush`); remote Turso only, no `file:` support |

Both `/node` and `/web` re-export `./utils` and share the same core API:

- `defineDb(schema)` — binds a Drizzle schema to a driver-specific libsql client and returns `getDb(env: DbEnv): Db<TSchema>`. The returned `getDb` is closure-cached per `defineDb` call (i.e. one cache per app): the D1 branch caches on a fixed key, the libsql branch is keyed on `LIBSQL_URL` so a changed URL rebuilds the client.
- `DbEnv` — `{ DB_TYPE?, DB?, LIBSQL_URL?, LIBSQL_AUTH_TOKEN? }`. `DB_TYPE` selects the driver: `'libsql'` (default) or `'d1'`. `DB` is the D1 binding, required only when `DB_TYPE` is `'d1'`. `LIBSQL_URL` falls back to `file:./src/database/data.db` when unset.
- `Db<TSchema>` — exported type alias for `BaseSQLiteDatabase<'async', unknown, TSchema>`. Driver-agnostic (both `DrizzleD1Database` and `LibSQLDatabase` are subtypes), so a single reference accepts either driver, but driver-specific extras (e.g. `.batch`) are not on this type — narrow at the call site if needed.

### `./utils`

Re-exported from both `/node` and `/web`. `trackingFields` query helpers built around the shared `isDeleted` / `expiresAt` / `updatedAt` columns.

| Helper | Signature | What it does |
| --- | --- | --- |
| `notDeleted(table)` | `(table) => SQL` | `eq(table.isDeleted, 0)` |
| `withNotDeleted(table, condition?)` | `(table, condition?) => SQL` | Combines `notDeleted(table)` with an optional extra condition via `and` |
| `softDelete()` | `() => { isDeleted: 1, updatedAt: Date }` | Update payload for a soft delete |
| `isNotExpired(table)` | `(table) => SQL` | Matches rows where `expiresAt` is `NULL` or in the future (`unixepoch()`) |
| `withNotDeletedAndNotExpired(table, condition?)` | `(table, condition?) => SQL` | Combines `notDeleted` + `isNotExpired` with an optional extra condition |
| `withUpdatedTimestamp(data)` | `(data) => data & { updatedAt: Date }` | Spreads `data` with a fresh `updatedAt` |
| `isExpired(expiresAt)` | `(expiresAt: number \| null) => boolean` | Manual expiration check against `Date.now()` |

## Notes

- Built with `tsdown` (`pnpm --filter @cdlab996/db build`, or `dev` for `--watch`); entries are `src/node.ts`, `src/web.ts`, `src/utils.ts`, emitted as ESM + CJS with `.d.mts` types (`tsdown.config.ts`).
- `@libsql/client` and `drizzle-orm` are kept **external** in the build so consumers resolve their own copies — this is required for the OpenNext apps' `serverExternalPackages` (`@libsql/client`, `@libsql/hrana-client`, `@libsql/isomorphic-ws` in `next.config.ts`) to keep matching the import, and for wrangler to resolve the libsql chain via the `workerd` export condition.
- After editing this package, consumers won't see the change until it's rebuilt — run `pnpm --filter @cdlab996/db build` (or `dev --watch`) or let `pnpm prepare` build it as part of `pnpm install`.

## License

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
