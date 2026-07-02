# Repo Changelog

[English](./README.md) | [中文](./README.zh-CN.md)

Track releases and changelogs from multiple GitHub repositories in one unified, browser-processed dashboard — no accounts, no server-side storage of your selections. Built with **Nuxt 4 (Vue 3)** and data sourced from [ungh.cc](https://ungh.cc).

Preview: https://repo-changelog.vercel.app/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/index.png)
![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/repos.png)

## Features

- **Repository search** (`app/pages/repos.vue`)
  - Search by individual repository (`owner/repo`), user, or organization
  - Sort results by stars, forks, name, or last updated
  - Runs fully client-side against the `ungh.cc` API — no search logic on the server

- **Multi-repository tracking**
  - Select and manage multiple repositories at once
  - Selections persist via URL sharing, so a combination of repos can be shared with a link
  - Favorite groups (`app/composables/useFavoriteGroups.ts`) — named, reusable sets of repos stored client-side via `useStorage`

- **Unified changelog dashboard** (`app/pages/index.vue`)
  - Chronological timeline of releases across all selected repositories
  - Expandable release notes with full markdown rendering via `@nuxtjs/mdc`
  - Direct links to GitHub releases

## Tech Stack

- **Framework** — Nuxt 4, Vue 3
- **UI** — `@nuxt/ui`
- **Markdown** — `@nuxtjs/mdc` (highlighting for `diff`, `ts`, `tsx`, `vue`, `css`, `sh`, `js`, `json`)
- **Composables** — `@vueuse/nuxt`
- **Rendering** — ISR on `/` with a 60s revalidate window (`routeRules` in `nuxt.config.ts`)
- **Data source** — [ungh.cc](https://ungh.cc), configurable via the `API_URL` env var (`nuxt.config.ts`)
- **Deploy target** — Vercel

> This app is excluded from the root Biome config and manages its own linting/formatting.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (workspace root)

### Install

```bash
# From the monorepo root
pnpm install
```

### Development

```bash
pnpm --filter @cdlab996/repo-changelog dev
```

Dev server available at `http://repo-changelog.localhost:3355` (via `@dotns/nsl`).

### Build / Deploy

```bash
# Production build
pnpm --filter @cdlab996/repo-changelog build

# Static generation
pnpm --filter @cdlab996/repo-changelog generate

# Preview a production build locally
pnpm --filter @cdlab996/repo-changelog preview
```

## License

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
