# @cdlab/utils

Generic **browser + Node** utilities shared across the monorepo — clipboard copy,
file download, byte formatting, IndexedDB key-value storage, timestamped logging,
precise decimal arithmetic, and Argon2id password hashing — one ESM library
consumed as a `workspace:*` dependency.

```diff
- 0.1 + 0.2                        // 0.30000000000000004  — float drift
- 2.3 * 100                        // 229.99999999999997   — float drift
+ plus(0.1, 0.2)                   // 0.3
+ times(2.3, 100)                  // 230
```

Seven small, dependency-light modules, each usable on its own; the only heavy
dependency (`jszip`) is **lazy-loaded** so it never lands in a consumer's bundle
unless the ZIP helper is actually called.

## Why

Every app in the workspace re-implements the same handful of primitives — copy a
string to the clipboard with a legacy fallback, trigger a browser download, print
a human-readable byte size, hash a password. `@cdlab/utils` is the single home
for those, so a fix or a hardening lands once and every consumer inherits it.

- **Split by runtime, not bundled as one blob.** Browser-only helpers
  (`clipboard`, `download`, `idb-store`) and universal ones (`format`, `logger`,
  `np`, `password`) live side by side; tree-shaking drops what an app doesn't
  import.
- **No surprises in the bundle.** `jszip` is imported dynamically inside
  `downloadFilesAsZip` — apps that never zip never pay for it.
- **Correct-by-default primitives.** `copyToClipboard` never throws (returns a
  boolean), `np` fixes IEEE-754 float drift, `password` uses Argon2id — the sharp
  edges are handled once, here.

## Quick start

`@cdlab/utils` is part of the [`@cdlab/projects-monorepo`](../../README.md).
Add it as a workspace dependency:

```json
{
  "dependencies": {
    "@cdlab/utils": "workspace:*"
  }
}
```

Import from the package root — the barrel re-exports every module:

```ts
import { copyToClipboard, downloadFile, formatBytes, plus } from '@cdlab/utils'

await copyToClipboard('hello')          // -> true
downloadFile({ data: blob, filename: 'export.json' })
formatBytes({ bytes: 1536 })            // -> '1.5 KB'
plus(0.1, 0.2)                          // -> 0.3
```

Consumers resolve the **built** `dist/index.mjs`, not `src/` — see
[Build, test & rebuild](#build-test--rebuild).

## Modules

| Module | Source | Runtime | Key exports |
| --- | --- | --- | --- |
| `clipboard` | `src/clipboard.ts` | browser | `copyToClipboard(message, opts?)` — Clipboard API with `execCommand('copy')` fallback; never throws. |
| `download` | `src/download.ts` | browser | `downloadFile({ data, filename })` — single file from Blob/URL; `downloadFilesAsZip(files, prefix)` — ZIP via lazy `jszip`. |
| `format` | `src/format.ts` | universal | `formatBytes({ bytes, decimals? })`; `formatFileSize(bytes)` (**deprecated**). |
| `idb-store` | `src/idb-store.ts` | browser | `createIDBStore<T>(dbName, storeName?, version?)` → `get`/`set`/`remove`/`removeBatch`/`list`/`getAll`/`clear`; `deleteIDBDatabase(dbName)`. |
| `logger` | `src/logger.ts` | universal | `logger` — `log`/`info`/`warn`/`error`/`debug`, each prefixed with a local-time timestamp. |
| `np` | `src/np/index.ts` | universal | `plus`/`minus`/`times`/`divide`/`round`/`strip`/`digitLength`/`float2Fixed`/`enableBoundaryChecking`/`createCalculator`/`NumberCalculator`. |
| `password` | `src/password.ts` | universal | `hashPasswordFn(password, salt?)` / `verifyPasswordFn(storedHash, attempt)` — Argon2id. |

### `clipboard`

`copyToClipboard(message, { fallbackToLegacy = true })` tries
`navigator.clipboard.writeText`; on absence or failure (non-secure context, older
browsers) it falls back to a hidden `<textarea>` + `document.execCommand('copy')`,
with special `Range`/`Selection` handling for iOS Safari. It **returns a boolean**
and never throws — the caller decides how to surface success/failure.

### `download`

`downloadFile` accepts a `Blob` or an existing object-URL string; it only revokes
the object URL when it created one from a Blob (a deliberate ownership rule — pass
your own URL and you own its lifecycle). `downloadFilesAsZip(files, prefix)`
**dynamically imports `jszip`**, builds the archive, and names it
`` `${prefix}_${yyyyMMdd_HHmmss}.zip` `` (timestamp via `date-fns`).

### `np` (numerical precision)

Fixes float arithmetic (`0.1 + 0.2`, `1.0 - 0.9`, …). Ops accept numbers **or
numeric strings** and are variadic (`plus(a, b, c, …)`). `createCalculator(v)`
returns a chainable `NumberCalculator` (`.plus().times().round().valueOf()`).
`enableBoundaryChecking(flag)` toggles a warning when a scaled intermediate
exceeds `MAX_SAFE_INTEGER` — see [Non-goals](#non-goals) for the caveats.

### `password`

`hashPasswordFn` derives an Argon2id digest (`@noble/hashes`, params
`t:3, m:1280, p:4, dkLen:32`) with a random 16-byte salt and returns a single
`saltHex:hashHex` string the caller persists. `verifyPasswordFn` splits that,
re-derives with the stored salt, and compares. See [Non-goals](#non-goals) for the
security caveats.

## Dependencies

| Dependency | Used by | Notes |
| --- | --- | --- |
| `@noble/hashes` | `password` | Argon2id + `randomBytes`. |
| `date-fns` | `download` | ZIP filename timestamp. |
| `jszip` | `download` | **Lazy** (`await import('jszip')`) — never in the main bundle unless `downloadFilesAsZip` is called. |

All three are `catalog:prod` deps. There are **no** env vars, network calls, or
Cloudflare bindings — the package is fully self-contained.

## Non-goals

This is a small utility grab-bag, not a framework. Known limits, by design:

- **`password` verify is not constant-time.** Hashes are compared with `===`, and
  `verifyPasswordFn` **throws** on a malformed stored hash (missing `:`). The
  functions are `async` for API stability, but hashing runs synchronously.
- **`np` boundary checking only warns**, never throws — and its
  `enableBoundaryChecking` flag is **module-global mutable state** shared by every
  caller in the process.
- **`logger` timestamps are `toLocaleString()`** — local timezone and
  locale-dependent, not ISO/UTC. Don't parse them; they're for humans.
- **No DOM tests.** `download` and `idb-store` touch `document` / `indexedDB` and
  are exercised in consuming apps, not here (see below).

## Build, test & rebuild

```bash
pnpm --filter @cdlab/utils build       # tsdown -> dist/index.mjs + dist/index.d.mts
pnpm --filter @cdlab/utils dev         # tsdown --watch
pnpm --filter @cdlab/utils test        # vitest --run (clipboard, format, logger, np, password)
pnpm --filter @cdlab/utils test:watch  # vitest watch
pnpm --filter @cdlab/utils typecheck   # tsc --noEmit
```

> **Rebuild gotcha.** `dist/` is prebuilt and committed, and consumers resolve
> `dist/index.mjs` — so **source edits are invisible to other apps until you
> rebuild** (`build` once, or `dev` for a watch). `prepack` runs `build`
> automatically. There is no dev server (this is a library, not an app).

Tests live under `test/**/*.test.ts` and cover `clipboard`, `format`, `logger`,
`np`, and `password`; the DOM-bound `download` and `idb-store` have no unit tests.

## Design

[`DESIGN.md`](DESIGN.md) is the source-of-truth spec — the module boundary and
runtime split, the mechanism behind each subsystem, the storage format for the
IndexedDB adapter and the `password` hash string, and the build/consumption model.
Read it before changing the barrel surface, the ZIP naming convention, or the
`password` storage format.

## License

[MIT](../../LICENSE) © 2025-PRESENT [wudi](https://github.com/WuChenDi)
