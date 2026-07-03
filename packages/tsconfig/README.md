# @cdlab996/tsconfig

Shared `tsconfig.json` presets for the workspace — each app or package extends one of these instead of hand-rolling its own compiler options.

## Install / Usage

Add it as a workspace dependency:

```json
{
  "devDependencies": {
    "@cdlab996/tsconfig": "workspace:*"
  }
}
```

Extend the relevant preset from the consumer's `tsconfig.json` (the package has no `exports` field, so subpaths resolve directly to the JSON files in the package root):

```json
{
  "extends": "@cdlab996/tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Configs

| File                  | Extends       | Used by                                                    | Notes                                                                                   |
| ---------------------- | ------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `base.json`            | —             | Everything (directly or transitively)                       | Strict mode, `NodeNext` module/resolution, `ES2017` target, `declaration`/`declarationMap` on. |
| `nextjs.json`          | `./base.json` | Next.js apps (`bycut`, `byplay`, `byshot`, `bytts`, `clearify`, `dropply-web`, `flox`, `SecureC`, `text2img`, `value-vision`, `vidl`, `wepush`) | Switches to `Bundler` resolution/`ESNext`, adds the `next` TS plugin, `jsx: preserve`, `noEmit`. |
| `hono.json`            | `./base.json` | Cloudflare Workers Hono apps (`baccarat`, `byplay-log`, `dropply-api`, `live-user`) | `ESNext` target/module, `Bundler` resolution, `jsx: react-jsx` with `jsxImportSource: hono/jsx`. |
| `react-library.json`   | `./base.json` | React component libraries (`packages/ui`)                   | `Bundler` resolution, `jsx: react-jsx`, no framework-specific plugin.                    |
| `utils.json`           | `./base.json` | Non-React library packages (`packages/utils`, `packages/cipher`, `packages/uncrypto`, `packages/db`) | Disables `declaration`/`declarationMap`, enables `noEmit: false`, targets `ES6`, adds `types: ["node"]`. |

## License

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
