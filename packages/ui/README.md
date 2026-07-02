# @cdlab996/ui

Shared React/Tailwind v4 component library for the workspace — shadcn/ui primitives, hooks, icons, and a handful of React Bits effects, consumed directly from source by every app in the monorepo.

## Install / Usage

Add it as a workspace dependency:

```jsonc
// apps/<app>/package.json
"@cdlab996/ui": "workspace:*"
```

The package ships **no build step** — every subpath resolves straight to a `.ts`/`.tsx` file under `src/`, so consumers get the source directly (no `dist/`, no compile step to keep in sync).

Import the Tailwind v4 entry from the app's own global stylesheet:

```css
/* apps/<app>/src/app/globals.css */
@import '@cdlab996/ui/globals.css';
```

Import components, hooks, and utilities by subpath:

```ts
import { Button } from '@cdlab996/ui/components/button'
import { useMobile } from '@cdlab996/ui/hooks/use-mobile'
import { cn } from '@cdlab996/ui/lib/utils'
```

## API / Exports

`package.json` `exports` map:

| Subpath | Resolves to | Contents |
|---|---|---|
| `./globals.css` | `src/styles/globals.css` | Tailwind v4 entry point |
| `./components/<name>` | `src/components/<name>.tsx` | shadcn/ui primitives (~50+: `button`, `dialog`, `sidebar`, `table`, `qr-code`, `chart`, …) |
| `./hooks/<name>` | `src/hooks/<name>.ts` | Shared React hooks (e.g. `use-mobile`) |
| `./lib/<name>` | `src/lib/<name>.ts` | Shared utilities (e.g. `utils` — `cn`) |
| `./icon/<name>` | `src/icon/<name>.tsx` | Standalone icon components (e.g. `GitHubIcon`, `XIcon`) |
| `./IK/<name>` | `src/IK/<name>.tsx` | App-shell building blocks (headers, footers, empty/loading/failed states, confirm dialog, version info) |
| `./reactbits/<name>` | `src/reactbits/<name>.tsx` | React Bits visual effects (`Aurora`, `Particles`, `Plasma`, `Threads`, `SpotlightCard`, …) |
| `./postcss.config` | `postcss.config.mjs` | Shared Tailwind PostCSS config |

## Notes

- **No build step.** There's nothing to run after editing a file — consumers pick up changes on next reload, since every subpath maps directly to source.
- **Biome ignores** `src/components/**/*.tsx` and `src/reactbits/**/*.tsx` — both are 3rd-party-derived (shadcn/ui generated primitives, React Bits effects) and are not linted by the root Biome config.
- `components.json` holds the shadcn/ui CLI config used to add/update primitives in `src/components/`.

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
