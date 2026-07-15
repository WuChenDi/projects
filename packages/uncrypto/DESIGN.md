# @cdlab/uncrypto — Design

> A cross-runtime Web Crypto shim. It exposes one `Crypto`-shaped surface
> (`subtle`, `randomUUID`, `getRandomValues`) backed by two parallel source files
> — one for Node (`node:crypto.webcrypto`), one for the browser / Worker
> (`globalThis.crypto`) — with the correct file chosen **at bundle time** by
> conditional exports, so the caller writes a single import and the shipped bundle
> contains no runtime environment check.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors. The package is stateless and dependency-free — this
doc is short by design, not by omission.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The two entries](#3-the-two-entries)
4. [Export resolution](#4-export-resolution)
5. [Gotchas & edge cases](#5-gotchas--edge-cases)
6. [Testing](#6-testing)
7. [Build & configuration](#7-build--configuration)

---

## 1. Background & goals

Several packages in this monorepo run the *same* code in two very different
places: a Cloudflare Worker / browser bundle at runtime, and a Node-based Vitest
runner in CI. The Web Crypto API is spelled differently in each — `node:crypto`'s
`webcrypto` namespace on Node, the `globalThis.crypto` global on the edge — and a
naive import of either breaks the other environment.

- **G1 — One import, both runtimes.** A caller writes
  `import { randomUUID } from '@cdlab/uncrypto'` once and it works in a Worker
  bundle and under Node.
- **G2 — No runtime branching.** The environment split is resolved by the bundler,
  not by an `if` in shipped code — so an edge bundle never contains a `node:crypto`
  reference to fail on.
- **G3 — Zero runtime footprint.** No dependencies; the shim compiles down to a
  direct pass-through to the platform crypto.

### Non-goals

- **Not an encryption library.** No ciphers, KDFs, or key management. (The
  `package.json` description is inherited from upstream `unjs/uncrypto` and is
  inaccurate — this is a shim, not a crypto suite. Real encryption lives in
  `@cdlab/cipher`.)
- **Not a polyfill.** It forwards to whatever the platform provides; it does not
  supply a Web Crypto implementation where one is missing (§5).
- **No API surface beyond three members.** `subtle`, `randomUUID`,
  `getRandomValues`. Nothing else is re-exported.

---

## 2. Architecture

```
                    consumer: import { randomUUID } from '@cdlab/uncrypto'
                                          │
                              package.json#exports (condition match)
                        ┌─────────────────┴─────────────────┐
                 browser / default                        node
                        │                                   │
              src/crypto.web.ts                     src/crypto.node.ts
              → globalThis.crypto                   → node:crypto.webcrypto
                        │                                   │
                        └──────────── tsdown build ─────────┘
                          dist/crypto.{web,node}.{mjs,cjs} + .d.mts
```

Two parallel source files implement an identical surface; the build emits both;
the export map decides which one a given consumer resolves. There is no shared
runtime module and no dispatcher — the "selection" is entirely a resolver
decision (§4).

---

## 3. The two entries

Both files export the same four things (three named + a `default` object). The
only difference is the backing source of crypto.

### 3.1 Node entry — `src/crypto.node.ts`

```ts
import nodeCrypto from 'node:crypto'
export const subtle: Crypto['subtle'] = nodeCrypto.webcrypto?.subtle || {}
export const randomUUID = () => nodeCrypto.randomUUID()
export const getRandomValues = (array) => nodeCrypto.webcrypto.getRandomValues(array)
```

- `subtle` reads `nodeCrypto.webcrypto?.subtle` and **falls back to `{}`** if
  `webcrypto` is absent (very old Node). The `// @ts-expect-error` above it
  silences the type gap for that `{}` fallback.
- `randomUUID` uses `nodeCrypto.randomUUID()` directly (available since Node 14.17,
  independent of `webcrypto`).
- `getRandomValues` reaches through `nodeCrypto.webcrypto.getRandomValues` — see
  the asymmetry in §5.1.

### 3.2 Web entry — `src/crypto.web.ts`

```ts
const webCrypto = globalThis.crypto
export const subtle: Crypto['subtle'] = webCrypto.subtle
export const randomUUID = () => webCrypto.randomUUID()
export const getRandomValues = (array) => webCrypto.getRandomValues(array)
```

Straight delegation to `globalThis.crypto`, which is assumed present in Workers
and browsers. No `subtle` fallback — an edge runtime without `crypto.subtle` is
out of scope (§5.2).

### 3.3 The default export

Each file also default-exports a `Crypto`-shaped object bundling the three named
exports — so `import crypto from '@cdlab/uncrypto'` and
`import { randomUUID } from '@cdlab/uncrypto'` both work.

---

## 4. Export resolution

Selection happens **at bundle/resolve time**, driven by `package.json#exports`:

| Condition | Resolves to | Used by |
| --- | --- | --- |
| `browser` | `dist/crypto.web.*` | browser / Worker bundlers |
| `node` | `dist/crypto.node.*` | Node runtime + Node test runners |
| `default` | `dist/crypto.web.*` | edge / unknown targets (safe fallback) |

The `browser` and `node` conditions each split by `types` / `import` (ESM) /
`require` (CJS); the `default` condition is ESM-only (`types` + `import`, no
`require`). The `default` condition intentionally points at the **web** build: an unknown target
is more likely edge-like than Node-like, and the web file has no `node:crypto`
import to break resolution.

Legacy top-level fields serve resolvers that don't understand `exports`:

| Field | Target |
| --- | --- |
| `main` | `./dist/crypto.node.cjs` |
| `module` | `./dist/crypto.web.mjs` |
| `browser` | `./dist/crypto.web.mjs` |
| `types` | `./dist/crypto.web.d.mts` |

---

## 5. Gotchas & edge cases

### 5.1 Asymmetric `webcrypto` guarding on Node

In `crypto.node.ts`, `subtle` guards `webcrypto` with optional chaining
(`webcrypto?.subtle || {}`), but `getRandomValues` does **not**
(`nodeCrypto.webcrypto.getRandomValues`). So on a hypothetical Node without
`webcrypto`, importing the module succeeds and `subtle` degrades to `{}`, but the
first `getRandomValues` call throws. This is acceptable because every supported
Node version ships `webcrypto`; the `subtle` guard is defensive belt-and-braces,
not a supported runtime path.

### 5.2 No web-side fallback

`crypto.web.ts` reads `globalThis.crypto` at module top level and dereferences
`.subtle` immediately. On a runtime lacking the global this throws at import.
That is by design (G-Non-goal: not a polyfill) — Workers and browsers always
provide it.

### 5.3 dist / src split

Consumers resolve `dist/*`, not `src/*`. Editing a source file has **no effect**
until `pnpm --filter @cdlab/uncrypto build` runs. Watch mode (`dev`) keeps `dist`
current during development. `pnpm prepare` (repo-root, post-install) builds it in
topological order.

### 5.4 Inaccurate package description

`package.json#description` still reads "a lightweight, fast, and secure
encryption library" — inherited from upstream `unjs/uncrypto`. It is a shim, not
an encryption library (§1 Non-goals). Do not treat that string as a spec.

---

## 6. Testing

`test/index.test.ts` defines one `runTests(crypto)` suite and runs it against
**both** `../src/crypto.node` and `../src/crypto.web` under a Node-based Vitest
runner. Assertions:

- `randomUUID` matches the UUID v4 regex and produces distinct values.
- `getRandomValues` mutates the array and handles `Uint8Array` / `Uint16Array` /
  `Uint32Array` without throwing.
- `subtle` is defined and is an `object`.

**Polyfill.** `test/polyfill.ts` is imported first and assigns
`globalThis.crypto = node:crypto.webcrypto`, so the *web* entry's
`globalThis.crypto` reference resolves inside the Node runner. It uses a
try / catch with an `Object.defineProperty` fallback because `globalThis.crypto`
is a read-only getter on newer Node — a plain assignment throws and the fallback
redefines the property as writable/configurable.

---

## 7. Build & configuration

| Script | Command | Purpose |
| --- | --- | --- |
| `build` | `tsdown` | Emit both entries as ESM + CJS with `.d.mts` declarations |
| `dev` | `tsdown --watch` | Rebuild on change |
| `test` | `vitest --run` | Run the shared suite once |
| `test:watch` | `vitest` | Watch-mode tests |
| `typecheck` | `tsc --project ./tsconfig.json --noEmit` | Type-only check |
| `prepack` | `pnpm build` | Ensure `dist/` exists before pack |

- **`tsdown.config.ts`** — `dts: true`, `format: ['esm', 'cjs']`,
  `entry: ['src/crypto.node.ts', 'src/crypto.web.ts']`, `clean` on non-watch runs.
- **`tsconfig.json`** — extends `@cdlab/tsconfig/utils.json`; includes `.`,
  excludes `node_modules` / `dist`.
- **Dependencies** — none at runtime; devDeps (`@cdlab/tsconfig`, `@types/node`,
  `tsdown`, `typescript`, `vitest`) are pinned via the workspace `catalog:dev`.
- **No deploy target.** It is `private` and workspace-internal; it ships nowhere
  on its own, only inside the bundles of the packages that import it.
