# @cdlab/uncrypto

A cross-runtime Web Crypto shim — exposes the same `Crypto`-shaped API (`subtle`, `randomUUID`, `getRandomValues`) whether the consuming code runs on Node (`node:crypto`'s `webcrypto`) or in a browser (`globalThis.crypto`), so callers don't need runtime branches.

## Install / Usage

Add as a workspace dependency:

```json
{
  "dependencies": {
    "@cdlab/uncrypto": "workspace:*"
  }
}
```

Import from the package root — bundlers pick the right build via the `browser` / `node` conditional exports:

```ts
import { getRandomValues, randomUUID, subtle } from '@cdlab/uncrypto'
```

## API / Exports

Both entries implement the same shape (default export + named exports):

| Export | Type | Behavior |
| --- | --- | --- |
| `subtle` | `Crypto['subtle']` | Node: `nodeCrypto.webcrypto?.subtle` (`src/crypto.node.ts`). Web: `globalThis.crypto.subtle` (`src/crypto.web.ts`) |
| `randomUUID` | `() => string` | Node: `nodeCrypto.randomUUID()`. Web: `globalThis.crypto.randomUUID()` |
| `getRandomValues` | `(array) => TypedArray` | Node: `nodeCrypto.webcrypto.getRandomValues(array)`. Web: `globalThis.crypto.getRandomValues(array)` |
| default | `Crypto` | Object bundling the three named exports above |

## Notes

- Two-file package: `src/crypto.node.ts` (Node `webcrypto`) and `src/crypto.web.ts` (browser `crypto`). The right file is resolved at build time via `tsdown` (see `tsdown.config.ts`, which builds both entries to ESM + CJS with `.d.mts` types); `package.json#exports` then picks `crypto.web.*` for the `browser` condition and `crypto.node.*` for the `node` condition (falling back to `crypto.web.*` as `default`).
- Used wherever the same code path has to run in both Workers/browser and Node test runners — e.g. `@cdlab/cipher`, `dropply-api`, `bytts`.
- After editing `src/`, rebuild with `pnpm --filter @cdlab/uncrypto build` (or `dev` for `tsdown --watch`) so consumers see the change.

## License

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
