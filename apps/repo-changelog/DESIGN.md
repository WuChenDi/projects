# repo-changelog — Design

> A backend-less Nuxt 4 app that merges GitHub release changelogs from many
> repositories into one date-sorted timeline. It has **no server of its own**:
> all data comes from the `ungh.cc` GitHub proxy, the selected repo set is
> carried in the URL query string, and the only persistence is browser
> `localStorage`. Markdown release notes are parsed to an MDC AST at fetch time
> and rendered inline.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The two routes & data flow](#3-the-two-routes--data-flow)
4. [Fetch, cache & markdown pipeline](#4-fetch-cache--markdown-pipeline)
5. [Data model & storage](#5-data-model--storage)
6. [Components & composables](#6-components--composables)
7. [Hydration-safety & analytics](#7-hydration-safety--analytics)
8. [Configuration & deployment](#8-configuration--deployment)

---

## 1. Background & goals

Following releases across many repositories normally means opening one releases
page per repo and interleaving them by date in your head. Hosted trackers solve
this but want an account and store your watchlist server-side.

`repo-changelog` takes the opposite path — a static-friendly Nuxt app with no
backend — and holds itself to these goals:

- **G1 — No backend.** All data comes from a third-party GitHub proxy
  (`ungh.cc`); the app stores nothing server-side and holds no credentials.
- **G2 — Selection is a URL.** The set of tracked repos lives in `?repos=` so a
  curated dashboard is a shareable, bookmarkable link.
- **G3 — One merged, chronological feed.** Releases from every selected repo are
  flattened and sorted newest-first into a single timeline.
- **G4 — Client-side interaction.** Search, sort, and keyword filtering are pure
  browser-side computed props; the server runs no search logic.
- **G5 — Low upstream traffic.** SSR payload reuse plus 60s ISR keeps `ungh.cc`
  calls deduped.

### Non-goals

- Not a GitHub API client — no auth, no private repos, no issues/PRs; read-only
  public release data via `ungh.cc`.
- Not an exhaustive archive — the merged feed is capped at 50 releases (§4.3).
- Not a general CMS or arbitrary-HTML renderer — release bodies are MDC ASTs
  rendered through a fixed component.

---

## 2. Architecture

```
              Vercel (Nitro node serverless — auto-detected preset)
  visitor ──► /            (index.vue)  ── SSR + ISR(60s) ──┐
          ──► /repos?repos= (repos.vue) ── SSR (dynamic) ───┤
                                                            │  useFetch / useAsyncData
                                                            ▼
                                                    ungh.cc  (GitHub proxy)
                                                  /repos/{o/r}, /orgs, /users,
                                                  /repos/{o/r}/releases

  browser localStorage: repo-history, repo-favorite-groups
  URL query string:     ?repos=a/b,c/d  (the only shareable "save")
```

Nuxt 4 (Vue 3) full-stack SSR. Root entry `app/app.vue` renders `<NuxtPage/>`
inside `<UApp>` → `ThemedBackground` → `IKHeader` / `main` / `Footer`. Only two
file-based routes exist. Rendering is **node serverless via Nitro on Vercel**
(nothing pins the edge/worker preset). There is no own API layer, no database,
no Cloudflare binding, and no secret.

---

## 3. The two routes & data flow

### 3.1 `/` — search & selection (`app/pages/index.vue`)

`searchRepositories()` normalizes the input, which accepts three forms:

1. `owner/repo` — validated against `^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$`, then
   `GET {apiUrl}/repos/{owner/repo}`.
2. bare `owner` — validated against `^[a-zA-Z0-9._-]+$`, then org-first / user-
   fallback (§3.3).
3. a pasted `github.com/...` URL — a regex extracts the `owner` or `owner/repo`
   segment; a full `owner/repo` URL validates the repo and navigates straight to
   `/repos`, a bare-owner URL is rewritten into the owner search.

Results render as selectable cards, sortable client-side by stars / forks / name
/ updated (`sortedSearchResults`, toggleable asc/desc). The user "clips" repos
into `selectedRepos`; `viewReleases()` saves them to history (§5) and navigates
to `/repos?repos=<csv>`.

### 3.2 `/repos` — merged changelog (`app/pages/repos.vue`)

`selectedRepos` is derived from `route.query.repos` (comma-split, deduped,
`Boolean`-filtered). `useAsyncData` (keyed on the joined repo list, watching
`route.query.repos`) filters to valid `owner/repo` entries and fans out
`Promise.all` over them, each calling `fetchRepoReleases()`. All releases are
flattened, sorted by `date` desc, and **sliced to 50** (§4.3). The template
renders each release with `MDCRenderer` and a client-side keyword filter
(`filteredReleases`) matching title / tag / repo / raw markdown.

### 3.3 Owner search is org-first, user-fallback

For a bare owner, `searchOwnerRepositories` tries `GET /orgs/{owner}/repos`
first; only on error / error-body does it fall back to `GET /users/{owner}/repos`
(`app/pages/index.vue`). Consequence: **an org and a user with the same name
resolve to the org.**

---

## 4. Fetch, cache & markdown pipeline

### 4.1 SSR-payload cache reuse

Every `useFetch` / `useAsyncData` uses a stable `key` and
`getCachedData: key => useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]`.
This dedupes and reuses the SSR payload on client hydration and across
navigations — the app's primary performance lever, keeping `ungh.cc` traffic
low. Combined with 60s ISR on `/` (§8), landing-route data can be up to ~60s
stale.

### 4.2 Markdown parsed to an AST at fetch time

`fetchRepoReleases` keeps only non-draft releases (`draft === false`) and, for
each, calls `parseMarkdown(release.markdown)` (from `@nuxtjs/mdc/runtime`) inside
the async data function — so the stored `Release.body` is already an MDC AST
(`MDCRoot`), not a string. The template renders it with `MDCRenderer`. It also
keeps `rawMarkdown` for the keyword filter. Syntax highlighting is limited to the
langs whitelisted in `mdc.highlight.langs` (`diff, ts, tsx, vue, css, sh, js,
json`); release notes in other languages render unhighlighted.

### 4.3 The 50-release cap

After flatten + date-sort, `repos.vue` `.slice(0, 50)` caps the merged feed at
50 releases **across all selected repos**. Users tracking many repos silently
lose older releases past the cut — a deliberate bound on render cost.

### 4.4 Per-repo failure isolation

`fetchRepoReleases` wraps each repo's fetch in try/catch and returns `[]` on
failure, so one broken repo is silently skipped. There is no per-repo error
boundary in the UI; only a total `useAsyncData` failure surfaces the error state.

---

## 5. Data model & storage

There is **no database and no server storage.** All persistence is browser
`localStorage` via VueUse `useStorage`, plus the URL query string.

| Key | Shape | Where | Notes |
| --- | --- | --- | --- |
| `repo-history` | `string[]`, `MAX_HISTORY = 10` | `index.vue` | Recently opened repos; guarded JSON serializer. |
| `repo-favorite-groups` | `FavoriteGroup[]` (`{id, name, repos[], createdAt}`) | `useFavoriteGroups.ts` | `useStorage` with `initOnMounted: true` + guarded serializer. |
| `?repos=a/b,c/d` | CSV in the URL | `repos.vue` | The only shareable / cross-session "save". |

Wire data types live in `shared/types/releases.ts` (shared with the server
bundle via the `~~/shared/...` alias): `GithubRepo`, `GithubRelease`,
`GithubReleaseAsset`, `SearchResult`, `RepoApiResponse`, `ReposApiResponse`, and
`Release` (whose `body` is an `MDCRoot`).

---

## 6. Components & composables

| File | Role |
| --- | --- |
| `components/ThemedBackground.vue` | Page shell + grain / ink-wash background, gated on `colorMode` readiness (§7). |
| `components/IKHeader.vue` | Masthead; shows the app `version` from runtimeConfig + a client-computed date (§7). |
| `components/Footer.vue` | Credits `ungh.cc` as the "wire service". |
| `components/RepoList.vue` | Reusable Selected / Recent list; props-driven, emits remove / clearAll / click. |
| `components/FavoriteGroups.vue` | CRUD UI over `useFavoriteGroups`, with a create modal. |
| `components/EmptyState.vue` | Onboarding placeholder on `/`. |
| `composables/useRepository.ts` | `getRepoUrl(owner/repo)` → GitHub URL. |
| `composables/useFavoriteGroups.ts` | Named repo sets in `localStorage`; `addGroup` / `updateGroup` / `removeGroup`, ids from `Date.now()` base36 + random. |

`components/SkyBg.vue` exists but is **dead code** — no component or page
references it. `@cdlab/driftflake` is a declared dependency but is imported
nowhere in `app/` or `shared/`. Neither is part of the design; do not build on
them.

---

## 7. Hydration-safety & analytics

- **Date-after-mount.** `IKHeader` renders its date only `onMounted`, avoiding a
  server/client timezone mismatch.
- **Color-mode gate.** `ThemedBackground` gates on `colorMode` readiness so the
  background doesn't flash a wrong theme on hydration.
- **Analytics** (`plugins/analytics.client.ts`) — Vercel Analytics, client-only,
  `disableAutoTrack: true`. It manually fires `pageview` on `onNuxtReady` and on
  every `page:finish` hook, so route changes are tracked without the auto tracker.

---

## 8. Configuration & deployment

### 8.1 Config knobs

Read in `nuxt.config.ts`:

- Modules: `@nuxt/ui`, `@nuxtjs/mdc`, `@vueuse/nuxt`.
- MDC highlight langs: `diff, ts, tsx, vue, css, sh, js, json`.
- Nuxt UI default color: `neutral`.
- `runtimeConfig.public.apiUrl` (`API_URL` env, default `https://ungh.cc`) +
  `public.version` (from `package.json`). Note: `runtimeConfig.apiUrl` (private)
  is also set but **only `public.apiUrl` is ever read** — the private one is
  redundant.
- `routeRules: { '/': { isr: 60 } }` — `/` is ISR with a 60s window; `/repos` is
  dynamic (not ISR).
- `devServer.host: '0.0.0.0'`; Vite `optimizeDeps.include: ['@vercel/analytics']`
  and `server.allowedHosts` from `VITE_ALLOWED_HOSTS` (comma-split).
- `compatibilityDate: '2025-06-01'`.

`app/app.config.ts` holds runtime-tweakable UI theme colors (`primary: red`,
`neutral: stone`) + prose overrides. `app.vue` carries extensive SEO / OG /
Twitter meta and four JSON-LD blocks (WebSite, WebApplication,
SoftwareApplication, BreadcrumbList), canonical
`https://repo-changelog.vercel.app/`.

### 8.2 Environment

| Env var | Default | Meaning |
| --- | --- | --- |
| `API_URL` | `https://ungh.cc` | Data-source override. |
| `VITE_ALLOWED_HOSTS` | *(empty)* | Comma-separated Vite dev allowed hosts. |

Both optional. There are no secrets or API keys (`ungh.cc` is unauthenticated).

### 8.3 Scripts & deployment

`package.json` scripts (real, verbatim): `dev` (`nsl run nuxt dev`), `build`
(`nuxt build`), `generate` (`nuxt generate`), `preview` (`nuxt preview`),
`postinstall` (`nuxt prepare`), `typecheck` (`nuxt typecheck` via `vue-tsc`).
There is **no `lint` and no `test` script**; the app is excluded from the root
Biome config. Deploy target is **Vercel** — Nuxt/Nitro auto-detects the preset;
no worker/edge pin. Monorepo tooling: pnpm workspace with `catalog:` versions,
`@cdlab/tsconfig` base config, Renovate for dependency maintenance.
