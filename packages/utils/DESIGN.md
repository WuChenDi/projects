# @cdlab/utils — Design

> A small, build-only ESM library of shared browser + Node primitives —
> clipboard, download, byte formatting, IndexedDB key-value storage, timestamped
> logging, precise decimal arithmetic, and Argon2id password hashing. Seven
> independent modules re-exported from one barrel, consumed across the workspace
> as a `workspace:*` dependency. No server, no routes, no env, no network — the
> only heavy dependency is lazy-loaded.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — source doc-comments and reviews reference them as
`design §N`.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [clipboard](#3-clipboard)
4. [download](#4-download)
5. [format](#5-format)
6. [idb-store](#6-idb-store)
7. [logger](#7-logger)
8. [np — numerical precision](#8-np--numerical-precision)
9. [password](#9-password)
10. [Build & consumption](#10-build--consumption)

---

## 1. Background & goals

Every app in the monorepo needs the same handful of low-level primitives. Copying
them per-app means a clipboard-fallback fix or an Argon2 parameter bump has to be
made in a dozen places. `@cdlab/utils` centralizes them, and holds itself to:

- **G1 — One home, many consumers.** A single package; a fix lands once and every
  `workspace:*` consumer inherits it on rebuild.
- **G2 — Pay only for what you import.** Modules are independent and side-effect
  free at import; the one heavy dependency (`jszip`) is loaded dynamically.
- **G3 — Runtime-honest.** Browser-only helpers and universal helpers coexist, but
  the boundary is explicit (§2) so a Node consumer never accidentally pulls a DOM
  path into a hot code path.
- **G4 — Correct primitives.** The sharp edges — clipboard fallbacks, float drift,
  password hashing — are solved once, here, with sensible defaults.

### Non-goals

- **Not a framework or a kitchen sink.** Each module is a few functions; there is
  no plugin system, no config object, no DI.
- **Not a hardened crypto library.** `password` uses Argon2id but compares hashes
  with `===` (not constant-time) and uses a modest memory cost (§9). It is fit for
  gating, not for adversarial timing-attack surfaces.
- **Not a structured-logging library.** `logger` is a thin `console` wrapper with
  human timestamps (§7) — no levels filtering, no transports, no JSON output.
- **No isomorphic guarantees for the browser modules.** `clipboard`, `download`,
  and `idb-store` require DOM / `window` / `indexedDB` and will throw in Node.

---

## 2. Architecture

The package is a build-only library. `src/index.ts` is a barrel that re-exports
all seven modules; `tsdown` bundles it to `dist/index.mjs` (+ `dist/index.d.mts`).
Consumers import only from the package root — there are no deep subpath exports.

```
                       @cdlab/utils
  ┌──────────────── src/index.ts (barrel) ────────────────┐
  │                                                        │
  │  universal (Node + browser)      browser-only          │
  │  ─────────────────────────       ────────────          │
  │  format    (§5)                  clipboard  (§3)        │
  │  logger    (§7)                  download   (§4)        │
  │  np        (§8)                  idb-store  (§6)        │
  │  password  (§9)                                         │
  └────────────────────────┬───────────────────────────────┘
                           │  tsdown (ESM, target ES2018)
                           ▼
              dist/index.mjs  +  dist/index.d.mts   ← consumers resolve this
```

**Module independence.** No module imports another. The barrel is `export *` per
file, so tree-shaking in a consumer's bundler drops unused modules. The three
runtime dependencies are partitioned: `password` → `@noble/hashes`, `download` →
`date-fns` (static) + `jszip` (dynamic). `clipboard`, `format`, `logger`,
`idb-store`, and `np` have **zero** runtime dependencies.

**Barrel caveat.** `export * from './np'` re-exports the module's **named**
exports (`plus`, `minus`, `NumberCalculator`, …) but not its `default` (`NP`)
export — ES `export *` never re-exports a default. Consumers reach the named
functions from the package root; the aggregate `NP` object is a submodule-only
convenience.

**Runtime split.** Universal modules use only standard JS; browser modules touch
`document` / `window` / `navigator` / `indexedDB`. `tsdown` targets `ES2018`; the
TS compiler target is `ES6` via `@cdlab/tsconfig/utils.json → base.json`
(`module: ESNext`, `moduleResolution: Bundler`, `types: ['node']`).

---

## 3. clipboard

**Entry:** `src/clipboard.ts` — `copyToClipboard(message, opts?)` → `Promise<boolean>`.

Contract: **never throws; returns whether the copy succeeded.** Flow:

1. Reject a non-string / empty `message` early (`console.warn`, return `false`).
2. If `navigator.clipboard?.writeText` exists, `await` it → `true`.
3. Otherwise, if `fallbackToLegacy` (default `true`), run `legacyCopy` → boolean.
4. If the async path throws (e.g. permission denied), fall back to `legacyCopy`
   when allowed, else `false`.

`legacyCopy` builds an off-screen readonly `<textarea>`, selects it, and calls the
deprecated `document.execCommand('copy')`. **iOS Safari** needs a `Range` +
`Selection` + `setSelectionRange` dance instead of a plain `.select()` — handled
by a `/ipad|iphone/i` UA check. The textarea is always removed in a `finally`.

Sole knob: `CopyOptions.fallbackToLegacy` (default `true`).

---

## 4. download

**Entry:** `src/download.ts`.

### 4.1 `downloadFile({ data, filename })`

`data` is a `Blob` or an existing object-URL string. It creates a temporary
`<a download>`, appends it, clicks, and removes it. **Ownership rule:** it calls
`URL.revokeObjectURL` **only when it created the URL itself** (from a Blob) — if
the caller passes a string URL, revoking is the caller's responsibility. Getting
this wrong would revoke a URL the caller still needs, or leak one it created.

### 4.2 `downloadFilesAsZip(files, prefix)`

`files` is `ZipFileEntry[]` (`{ path, data }` where `data` is
`Blob | ArrayBuffer | Uint8Array | string`). The function **dynamically imports
`jszip`** (`await import('jszip')`) — the key design decision: `jszip` never
enters a consumer's main bundle unless this function is actually called. It adds
each entry, generates a `blob`, and delegates to `downloadFile`.

**Naming convention:** `` `${prefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.zip` ``
(timestamp via `date-fns`). Callers pass only `prefix`; the timestamp suffix is
fixed so batch exports sort chronologically and never collide.

---

## 5. format

**Entry:** `src/format.ts`.

- `formatBytes({ bytes, decimals = 1 })` — base-1024, units `B..TB`. Returns
  `'0 B'` for `bytes <= 0`, clamps the unit index to the top unit, and renders
  `value.toFixed(decimals)`.
- `formatFileSize(bytes)` — **`@deprecated`.** Legacy base-1024 up to `GB`,
  2-decimal, `parseFloat`-trimmed. Kept only for back-compat; new code uses
  `formatBytes`.

---

## 6. idb-store

**Entry:** `src/idb-store.ts` — `createIDBStore<T = ArrayBuffer>(dbName, storeName = 'blobs', version = 1)`
returns an `IDBStore<T>`.

### 6.1 Storage model

A **bare key-value object store** — one object store (default `'blobs'`) per
`(dbName, version)`, keys passed **out-of-line** (`store.put(value, key)`), no
indexes, no key path. `onupgradeneeded` creates the store only if it's missing.
The default value type is `ArrayBuffer` (the common blob-cache case), overridable
via the generic `T`.

### 6.2 Lazy self-healing connection

The open `IDBDatabase` is memoized in a promise singleton (`dbPromise`) opened on
first use. On an open **error**, `dbPromise` is reset to `null` so the next call
re-opens — a transient failure doesn't wedge the store permanently.

### 6.3 `withTransaction` (dual-mode helper)

One helper wraps every operation. It opens a transaction in the requested mode,
runs `fn(store)`, and resolves in one of two ways:

- If `fn` **returns an `IDBRequest`** (reads), resolve with `req.result ?? null`
  on `onsuccess`.
- If `fn` **returns void** (writes/deletes), resolve on `tx.oncomplete`.

Both `tx.onerror` and `tx.onabort` reject. `removeBatch` short-circuits on an
empty array (no transaction). `list()` returns keys via `getAllKeys()`.

`deleteIDBDatabase(dbName)` is a standalone helper wrapping
`indexedDB.deleteDatabase`.

---

## 7. logger

**Entry:** `src/logger.ts` — a `logger` object with `log`/`info`/`warn`/`error`/`debug`.

Each method prepends `` `[${new Date().toLocaleString()}]` `` and forwards
`(message, ...optionalParams)` to the matching `console` method. **Timestamps are
local-timezone, locale-dependent strings — not ISO/UTC** — so they read well for a
human but must not be machine-parsed. The file carries eslint-disables for
`no-console` / `no-explicit-any` because that is the whole point of the module.

---

## 8. np — numerical precision

**Entry:** `src/np/index.ts`. Fixes IEEE-754 float errors (`0.1 + 0.2`,
`1.0 - 0.9`, …) by scaling floats to integers, operating, then scaling back.

### 8.1 Primitives

- `digitLength(num)` — decimal-digit count, scientific-notation aware.
- `float2Fixed(num)` — scales a float to an integer (`× 10^digitLength`).
- `strip(num, precision = 15)` — trims to `DEFAULT_PRECISION` significant digits
  via `toPrecision`, removing residual drift.
- `times` is the base operation; `plus` / `minus` are **built on `times`**;
  `divide` corrects `10**-n` drift by wrapping the scale factor in `strip`.
- `round(num, decimal)` — half-up rounding with sign preservation.

All ops accept **numbers or numeric strings** (`` `${number}` `` template-literal
type) and are made **variadic** by `createOperation` (a `reduce` over the args).

### 8.2 Chainable calculator

`NumberCalculator` (via `createCalculator(value)`) chains `plus`/`minus`/`times`/
`divide`/`round`, each mutating internal state and returning `this`. `valueOf()`
and `toString()` return the `strip`-corrected value, so a calculator interoperates
in numeric contexts.

### 8.3 Boundary checking (global mutable state — caveat)

`_boundaryCheckingState` is a **module-level mutable flag** (default `true`),
toggled by `enableBoundaryChecking(flag)`. When on, `checkBoundary` emits a
`console.warn` if a scaled intermediate exceeds `MAX_SAFE_INTEGER` — it **warns,
never throws**, and the result may be inaccurate past that boundary. Because the
flag is process-global, toggling it in one consumer affects all callers in the
same process — a deliberate simplicity trade-off, not per-call configurable.

### 8.4 Exports

Named: `strip`, `plus`, `minus`, `times`, `divide`, `round`, `digitLength`,
`float2Fixed`, `enableBoundaryChecking`, `createCalculator`, `NumberCalculator`.
Plus a `default` aggregate `NP` object — reachable from `./np` directly, **not**
through the package-root barrel (§2).

---

## 9. password

**Entry:** `src/password.ts`.

- `hashPasswordFn(password, providedSalt?)` — derives an **Argon2id** digest
  (`@noble/hashes/argon2.js`) with `ARGON2_PARAMS = { t: 3, m: 1280, p: 4,
  dkLen: 32 }`. Salt is `providedSalt` or a fresh `randomBytes(16)`.
- `verifyPasswordFn(storedHash, passwordAttempt)` — splits, re-derives with the
  stored salt, and compares.

### 9.1 Storage format

A single string `` `${saltHex}:${hashHex}` `` — the caller persists exactly this;
there is no side storage. `verify` splits on `:`; a value missing either half
**throws** `Invalid hash format` (callers must guard input they don't control).

### 9.2 Security caveats

- **Comparison is `attemptHash === originalHash`** — a plain string compare, not
  constant-time. Argon2's own cost dominates, but this is not a timing-hardened
  path.
- **Memory cost `m: 1280` KiB** is modest — chosen to run in constrained runtimes
  (Workers), not to maximize GPU-cracking resistance.
- The functions are `async` (stable API surface) but `argon2id` runs synchronously
  under the hood.

---

## 10. Build & consumption

### 10.1 Build

`tsdown.config.ts`: single entry `./src/index.ts`, `format: ['esm']`, `dts: true`,
`target: 'ES2018'`, `clean` only when not `--watch`. Output: `dist/index.mjs` +
`dist/index.d.mts`. `package.json` maps `main`/`module`/`types` and the `.`
export to those files; only `.` and `./package.json` are exported subpaths.

### 10.2 Consumption & the rebuild rule

Consumers add `"@cdlab/utils": "workspace:*"` and import from the root. **They
resolve the committed `dist/`, not `src/`** — so a source edit is invisible to
other apps until a rebuild (`pnpm --filter @cdlab/utils build`, or `dev` for a
watch). `prepack` runs `build`; the monorepo's `pnpm prepare` builds workspace
packages in topological order after install. There is no dev server.

### 10.3 Tests

`vitest.config.ts`: `@` → `src` alias, `include: ['test/**/*.test.ts']`. Present:
`test/clipboard.test.ts`, `test/format.test.ts`, `test/logger.test.ts`,
`test/password.test.ts`, `test/np/index.test.ts`. The DOM-bound `download` and
`idb-store` have **no unit tests** — they are exercised in consuming apps.
`typecheck` is `tsc --noEmit` against `tsconfig.json`.

### 10.4 No deployment

This is a library: no deploy target, no server, no env vars, no bindings, no
network. It ships as source-of-truth `dist/` inside the monorepo and is never
published or deployed on its own.
