# @cdlab996/utils

Generic browser/Node utilities shared across the workspace's apps — clipboard, file download, byte formatting, IndexedDB key-value storage, timestamped logging, precise decimal arithmetic, and password hashing.

## Install / Usage

Add as a workspace dependency:

```json
{
  "dependencies": {
    "@cdlab996/utils": "workspace:*"
  }
}
```

Import from the package root — it re-exports every module (`src/index.ts`):

```ts
import { copyToClipboard, downloadFile, formatBytes, logger } from '@cdlab996/utils'
```

Consumers resolve `dist/index.mjs` (built by `tsdown`), not `src/`.

## API / Exports

| Module           | Source                | Key exports                                                                                  |
| ----------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| `clipboard`       | `src/clipboard.ts`     | `copyToClipboard(message, opts?)` — Clipboard API with legacy `execCommand('copy')` fallback   |
| `download`        | `src/download.ts`      | `downloadFile({ data, filename })` — single file via Blob/URL; `downloadFilesAsZip(files, prefix)` — bundles files into a ZIP (via dynamic `jszip` import) named `{prefix}_yyyyMMdd_HHmmss.zip` |
| `format`          | `src/format.ts`        | `formatBytes({ bytes, decimals? })` — human-readable byte sizes; `formatFileSize(bytes)` (deprecated, use `formatBytes`) |
| `idb-store`       | `src/idb-store.ts`     | `createIDBStore<T>(dbName, storeName?, version?)` — generic IndexedDB key-value adapter (`get`/`set`/`remove`/`removeBatch`/`list`/`getAll`/`clear`); `deleteIDBDatabase(dbName)` |
| `logger`          | `src/logger.ts`        | `logger` — `log`/`info`/`warn`/`error`/`debug`, each prefixed with a timestamp                 |
| `np`              | `src/np/index.ts`      | Precise decimal arithmetic: `plus`, `minus`, `times`, `divide`, `round`, `strip`, `digitLength`, `float2Fixed`, `enableBoundaryChecking`, `createCalculator` / `NumberCalculator` (chainable), default export `NP` |
| `password`        | `src/password.ts`      | `hashPasswordFn(password, providedSalt?)` / `verifyPasswordFn(storedHash, passwordAttempt)` — Argon2id hashing (`@noble/hashes`) |

## Notes

- Built with `tsdown`; consumers import from `dist/index.mjs` (types from `dist/index.d.mts`).
- After editing source, rebuild with `pnpm --filter @cdlab996/utils build` (or `dev` for `tsdown --watch`) so consumers see the change.
- Tested with `vitest` — `pnpm --filter @cdlab996/utils test` (one-shot) or `test:watch`.

## License

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
