# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@cdlab996/projects-monorepo` — a personal collection of privacy-first web tools sharing a single Turborepo + pnpm workspace. Most apps run **entirely in the browser** with zero server uploads (Transformers.js / FFmpeg.wasm / WebGPU / Web Workers); the few that have a server are Cloudflare Workers (Hono), not traditional Node.

Workspace layout:

- `apps/*` — 15 deployable products (Next.js, Nuxt, Cloudflare Workers)
- `packages/*` — 5 shared libraries (`ui`, `utils`, `cipher`, `uncrypto`, `tsconfig`)

Apps fall into three runtime families with different toolchains:

| Family | Apps | Build tool | Deploy target |
| --- | --- | --- | --- |
| **Next.js (App Router)** | `bycut`, `byplay`, `bytts`, `clearify`, `dropply-web`, `flox`, `SecureC`, `text2img`, `value-vision`, `vidl` | `next build` (some `--webpack`) | Cloudflare Pages (`@cloudflare/next-on-pages`), `text2img` uses `@opennextjs/cloudflare` |
| **Cloudflare Workers (Hono)** | `baccarat`, `byplay-log`, `dropply-api`, `live-user` | `wrangler deploy --minify` | Cloudflare Workers + Durable Objects / D1 |
| **Nuxt 4 (Vue 3)** | `repo-changelog` | `nuxt build`/`generate` | Vercel |

## Commands

Dev servers are routed through `@nsio/nsl` (`nsl run …`) — each app is reachable at **`http://<name>.localhost:3355`** (no port hunting).

```bash
# Workspace-wide
pnpm install                                 # also runs `prepare` → builds all packages/* dist/
pnpm dev                                     # turbo dev (parallel, all apps)
pnpm build                                   # turbo build (all)
pnpm lint                                    # turbo lint (delegates to each app)
pnpm lint:biome                              # biome check . at root
pnpm format                                  # biome format . --write
pnpm clean                                   # bash scripts/clean.sh — wipes node_modules / .turbo / .next / dist / .wrangler

# Single-app convenience aliases (also: dev:bycut, dev:flox, dev:bytts, …)
pnpm dev:dropply                             # filters apps/dropply-* (web + api together)

# Filter explicitly
pnpm --filter @cdlab996/<name> dev|build|typecheck|lint
pnpm --filter ./apps/<dir> dev|build         # path-based filter

# Cloudflare Workers (baccarat, byplay-log, dropply-api, live-user)
pnpm --filter @cdlab996/<worker> dev         # nsl run wrangler dev
pnpm --filter @cdlab996/<worker> deploy      # wrangler deploy --minify
pnpm --filter @cdlab996/<worker> cf-typegen  # regenerate CloudflareBindings type

# Drizzle (dropply-api, byplay-log)
pnpm --filter @cdlab996/<worker> db:gen      # generate migration from schema
pnpm --filter @cdlab996/<worker> db:migrate  # apply (LibSQL)
pnpm --filter @cdlab996/<worker> cf:localdb  # apply to local D1
pnpm --filter @cdlab996/<worker> cf:remotedb # apply to remote D1
pnpm --filter @cdlab996/<worker> db:studio   # drizzle-kit studio

# Workspace package tests (vitest)
pnpm --filter @cdlab996/utils  test          # one-shot
pnpm --filter @cdlab996/cipher test:watch
pnpm --filter @cdlab996/utils  exec vitest run path/to.test.ts -t "name"

# Explicit deploys (CI does NOT auto-deploy)
pnpm deploy:baccarat | deploy:dropply-api | deploy:live-user | deploy:text2img
```

Drizzle's `DB_TYPE` env var (`libsql` default, or `d1`) selects the dialect at config time — see `apps/dropply-api/drizzle.config.ts`. `LIBSQL_URL` defaults to `file:./src/database/data.db`.

## Architecture

### Cloudflare Workers (Hono backends)

#### `baccarat` — Telegram Baccarat bot

Entry: `src/index.ts`. Hono app with one webhook endpoint (`POST /webhook`) and a Durable Object `BaccaratGameRoom` per chat for game state isolation.

- `src/durable-objects/game-room.ts` — DO with embedded SQLite (`new_sqlite_classes`). Routes by URL path (`/start-game`, `/place-bet`, `/process-game`, `/get-status`, `/stop-game`, `/enable-auto`, `/game-history`, `/game-detail`, `/health`). Lazy-inits `GameEngine` on first request via `initEngine()`.
- `src/game/game-engine.ts` — State machine: `idle → betting → processing → revealing → finished`. Uses Telegram dice rolls (1–6) for card dealing. `MessageSender` queues all bot messages to respect Telegram rate limits.
- `src/lib/storage.ts` — Wraps DO `state.storage` (KV + SQL) for game records.
- `src/handlers/commands.ts` — Grammy command registration (a `Bot` is constructed **per request** in the webhook handler — DO NOT reuse Bot instances across requests).
- `src/types.ts` — `createConfig(env)` parses timing knobs from env vars (`BETTING_DURATION_MS`, `AUTO_GAME_INTERVAL_MS`, `DICE_ANIMATION_WAIT_MS`, etc.) so timings are tunable per-deploy without code changes.

#### `dropply-api` — End-to-end encrypted file sharing API

Entry: `src/index.ts`. Hono + Drizzle (D1 / LibSQL) + Resend (email). Server **never sees plaintext** — encryption happens in `dropply-web` (browser); the API only stores ciphertext + metadata.

- Middleware: `accesslog`, `prettyJSON`, `requestId`, `cors`. Global error handler emits `{statusCode, message, stack?}` envelopes (`stack` only in debug).
- `src/database/schema.ts` — `sessions` (UUID id, `retrievalCode`, `expiresAt`) + `files` (cascade-delete on session). All tables share `trackingFields` (`createdAt`, `updatedAt`, `isDeleted` soft delete).
- `src/routes/` — `chest` (upload), `retrieve` (download), `download`, `config`, `email`. All composed via `src/routes/index.ts`.
- `src/lib/jwt.ts`, `src/lib/totp.ts` — Optional TOTP gate on retrieval.
- `src/cron/cleanup.ts` — Runs from the worker's `scheduled()` handler; deletes expired sessions/files via `cleanupExpiredContent(env)`.
- `src/global.ts` — Sets a global `logger` (winston) and `isDebug` flag. Imported for side effects from `index.ts`.
- Validation: `@hono/zod-validator` + `src/lib/validationSchemas.ts`.

#### `byplay-log` — ByPlay player log ingest

Entry: `src/index.ts`. Single route `POST /monitor?bury_content=…`. CORS locked to `https://byplay.pages.dev` + localhost.

- `src/database/schema.ts` — `playerLogs` table (auto-increment id) with JSON columns (`feature`, `playerConfig`, `vplayerRuntime`, `executeProgressInfos`) for flexible event shapes. Index on `userId`, `streamId`, `time`.
- `src/routes/monitor.ts` — Accepts the player's monitoring payload; the `bury_content` query param tags the event type.
- Same `global.ts` / winston logger pattern as `dropply-api`.

#### `live-user` — Real-time online user counter

Entry: `src/index.ts`. Mounts `homeRoutes`, `sdkRoutes`, `wsRoutes`. The frontend is a tiny embeddable script + an HTML page rendered by Hono JSX (`src/pages/`).

- `src/site-manager.ts` — `SiteManager` Durable Object. Uses **WebSocket Hibernation API** (`ctx.acceptWebSocket(server)`): the DO unloads when idle, saving cost. Connection state is preserved via `serializeAttachment(state)` and read back on each event.
- DO embeds SQLite for the `visit_counter` table (`new_sqlite_classes: ["SiteManager"]` migration).
- Per-site visit counts are atomic via `ctx.storage.sql.exec` updates.
- **Bug-fixed quirk** (see comment in `webSocketClose`): hibernation calls `webSocketClose` *after* the socket is already closed — never call `ws.close()` from there or it throws.
- `routes/sdk.ts` — Serves the embeddable JS snippet; `routes/ws.ts` proxies WebSocket upgrades into the DO.

### Next.js apps

All Next apps share these conventions: `nsl run next dev` for dev, `next build` (or `--webpack` for `clearify`/`flox`), `tsconfig` extends `@cdlab996/tsconfig/nextjs`, i18n via `next-intl` with `messages/{en,zh}.json`, Tailwind v4 via `@cdlab996/ui/globals.css`, shadcn/ui primitives from `@cdlab996/ui/components/*`. `middleware.ts` is the `next-intl` locale middleware unless noted.

#### `flox` — Multi-source video aggregation & playback

The most architecturally complex Next app. Searches 38+ Chinese video sources in parallel and streams results back via SSE.

- `src/app/api/search-parallel/route.ts` — **Edge runtime**. Reads sources from request body, fans out parallel fetches, streams JSON SSE chunks (`type: 'start' | 'result' | 'error' | 'done'`) as each source replies. Sources are not waited on — first replies arrive immediately.
- `src/app/api/proxy/route.ts` — Server-side proxy for video URLs (CORS bypass + ad filtering).
- `src/app/api/probe-resolution/` — Probes video stream resolution server-side (with `lib/player/resolution-cache.ts` deduping).
- `src/lib/api/` — `client.ts` re-exports `searchVideos` / `getVideoDetail`. `default-sources.ts` and `premium-sources.ts` define the 38+ source registry (each with `baseUrl`, `searchPath`, `priority`).
- `src/lib/store/` — Zustand stores: `favorites-store`, `history-store`, `search-history-store`, `settings-store`, `sidebar-store`, `header-reset-store` (all `persist`-middleware'd).
- `src/components/player/`, `src/components/FloxPlayer.tsx` — HLS.js + Volcengine VePlayer. `AdKeywordsInjector.tsx` handles SCTE-35 and keyword-based ad filtering.
- `src/components/ServiceWorkerRegister.tsx` — Service Worker for offline + caching.
- `src/components/PasswordGate.tsx` — Optional password gate before app loads. Premium content lives in `components/premium/` and is isolated from non-premium UI.
- `src/lib/hooks/useParallelSearch.ts` — Subscribes to the SSE search stream and merges results into a Zustand store as they arrive.

#### `bycut` — Browser video editor

The largest Next app — a full timeline-based editor with a manager-based core architecture. Locale-aware routing (`app/[locale]/`).

- `src/core/managers/` — Self-contained editor subsystems, each a singleton-style manager: `media-manager`, `timeline-manager`, `playback-manager`, `selection-manager`, `audio-manager`, `renderer-manager`, `scenes-manager`, `save-manager`, `project-manager`. `commands.ts` is the undo/redo command bus.
- `src/services/renderer/` — `canvas-renderer.ts` + `scene-builder.ts` + `scene-exporter.ts` + node-based render tree (`nodes/`). GPU-accelerated canvas compositing.
- `src/services/storage/` — `service.ts` with pluggable adapters: `indexeddb-adapter.ts` and `opfs-adapter.ts`. Migrations in `services/storage/migrations/`.
- `src/services/transcription/` — Hugging Face Transformers in a Web Worker (`worker.ts`) for AI captions.
- `src/services/timeline-thumbnail/`, `src/services/video-cache/` — Frame thumbnail generation + frame cache.
- `src/stores/` — Zustand stores for editor UI state (`editor-store`, `timeline-store`, `panel-store`, `media-preview-store`, `keybindings-store`, `assets-panel-store`, `sounds-store`, `stickers-store`).
- `src/stores/keybindings/` — User-customizable shortcuts (persisted).
- FFmpeg.wasm + `mediabunny` for media decoding/encoding; `wavesurfer.js` for waveforms.

#### `clearify` — Image/video toolbox

Three modes split into separate routes: `/bg` (background removal via Transformers.js + WebGPU), `/compress` (jSquash AVIF/JPEG/JXL/PNG/WebP), `/squish` (video compression via FFmpeg.wasm). No locale routing.

- `src/lib/wasm.ts` — Lazy-loads the right wasm modules per format.
- `src/lib/imageProcessing.ts` + `process.ts` — Pipeline: decode → transform → encode. Handles batch zip output via `jszip`.
- `src/lib/canvas.ts` — Canvas-based resize + composition.
- `src/components/pages/{bg,compress,squish}/` — One subdirectory per mode, mirroring the route structure.
- Builds with `--webpack` (Turbopack does not currently handle the wasm + worker mix here).

#### `SecureC` — Client-side file/text encryption

Uses `@cdlab996/cipher` (XChaCha20-Poly1305 + Argon2id + ECIES) and runs all crypto in a Web Worker.

- `src/workers/cryptoWorker.ts` — Posts progress messages back as `{ progress, stage }`. Handles both file-stream mode (10 MB chunks via `streamCrypto`) and text mode (`textCrypto`). Reads cipher header to auto-detect mode on decrypt.
- `src/store/` — Zustand stores for the crypto session.
- `src/lib/storage.ts` — IndexedDB-backed history of past operations.
- `src/scripts/generateKeys.js` (run via `pnpm --filter @cdlab996/securec gk`) — generates ECIES key pairs.

#### `dropply-web` — Dropply file sharing frontend (paired with `dropply-api`)

- `src/lib/crypto.ts` — AES-GCM + Argon2id, all client-side. Encryption key is **embedded in the URL fragment** (`#key=…`) so the server never receives it.
- `src/lib/api.ts` — Talks to `dropply-api`. Multipart upload: 20 MB chunks, 3 concurrent parts.
- `src/store/` — `useShareStore`, `useRetrieveStore`, `useAuthStore` (auth = optional TOTP gate).
- Tab-based UI: Share tab vs Retrieve tab. i18n (en/zh) via `next-intl`.

#### `text2img` — Browser AI text-to-image

- `src/app/api/{generate,models,prompts}/` — Edge route handlers; `generate` calls Cloudflare Workers AI with the requested model (FLUX, SDXL, DreamShaper).
- `src/lib/api.ts` — Frontend client; results streamed/polled back to the UI.
- TanStack Query for image history/cache.
- Builds with **OpenNext for Cloudflare** (`@opennextjs/cloudflare`), not `next-on-pages`. Deploys with `pnpm --filter @cdlab996/text2img deploy` (which runs `opennextjs-cloudflare build && deploy`).

#### `vidl` — Video downloader

Pure-browser stream download — `mux.js` + Streams API, near-zero memory footprint.

- `src/lib/download-engine.ts` — Core engine; pause/resume; exponential-backoff retry.
- `src/lib/m3u8-parser.ts` — Parses M3U8 manifest, extracts segments + AES-128 key URLs.
- `src/lib/aes-decryptor.ts` — Streaming AES-128-CBC decrypt of TS segments.
- `src/lib/video-utils.ts` — TS-to-MP4 mux via `mux.js`.
- `src/lib/batch-utils.ts` — Range download + batch parallelism.
- `src/stores/` — `download-store`, `batch-store`, `settings-store`.

#### `byplay` — Online HLS/MP4 player

- `src/components/player/` — HLS.js wrapper with ABR config, retry/buffer settings.
- Reports playback events to `byplay-log` worker (configurable endpoint).
- Has a "jump to vidl" quick-action for downloading the current video.

#### `bytts` — Text-to-speech tool

- `src/app/api/tts/` — Edge route that calls Microsoft Azure Cognitive Services Speech SDK with SSML; streams audio back.
- `src/app/api/config/` — Endpoint for managing custom API providers (the recently added "API manager" feature).
- `src/lib/builtin-apis.ts` — Built-in Azure API definitions; user-added APIs are stored client-side and can override builtins (see recent commits: batch-deletion + builtin-override).
- `src/store/useApiStore.ts` — Zustand store of user-configured APIs (with custom auth headers per recent feature add).

#### `value-vision` — Crypto/fiat/commodity comparison

- `src/lib/currencies.ts`, `rates.ts`, `exchangeRate.ts` — Static currency catalog + live rate fetch.
- No backend; rates are pulled from public APIs at runtime.

### Nuxt 4 app

#### `repo-changelog` — GitHub release/changelog dashboard

- `nuxt.config.ts` — Modules: `@nuxt/ui`, `@nuxtjs/mdc`, `@vueuse/nuxt`. ISR on `/` (60s revalidate). MDC with diff/ts/tsx/vue/css/sh/js/json highlighting.
- Backend data source: `https://ungh.cc` (configurable via `API_URL` env). No own server.
- `app/pages/`, `app/components/`, `app/composables/`, `app/plugins/` — standard Nuxt 4 layout.
- `shared/types/` — Types shared with the server bundle.
- **Excluded from root Biome** (has its own ESLint via `@nuxt/eslint` if added). Don't try to apply root lint rules here.

### Shared packages

#### `@cdlab996/ui` — Shared React/Tailwind v4 component library

- **No build step** — exposes raw source via subpath exports:
  - `./globals.css` — Tailwind v4 entry (apps import this from their `globals.css`)
  - `./components/<name>` → `src/components/<name>.tsx` (shadcn/ui primitives, ~50+)
  - `./hooks/<name>` → `src/hooks/<name>.ts`
  - `./lib/<name>` → `src/lib/<name>.ts`
  - `./icon/<name>`, `./IK/<name>`, `./reactbits/<name>` → curated icon sets and React Bits effects
  - `./postcss.config` → shared Tailwind PostCSS config
- **Biome ignores** `src/components/**/*.tsx` and `src/reactbits/**/*.tsx` (3rd-party-derived; don't lint).
- Consumers add it as `"@cdlab996/ui": "workspace:*"` and import like `import { Button } from '@cdlab996/ui/components/button'`.

#### `@cdlab996/utils` — Generic utilities

- Built with `tsdown`, tested with `vitest`. Consumers import from `dist/index.mjs`.
- Modules: `clipboard`, `format`, `idb-store`, `logger`, `np` (numerical-precision math). All re-exported from `src/index.ts`.
- After editing, run `pnpm --filter @cdlab996/utils build` (or `dev --watch`) so consumers see updates.

#### `@cdlab996/cipher` — Stream cipher library

- XChaCha20-Poly1305 + Argon2id (password mode) and ECIES (public-key mode) — both with a custom stream chunk format (see `header.ts`).
- Public API:
  - `streamCrypto.encrypt.withPassword | withPublicKey`
  - `streamCrypto.decrypt.withPassword | withPrivateKey`
  - `textCrypto.encrypt | decrypt`
  - Also exports the lower-level `StreamCipher`, `parseStreamHeader`, `detect`, error classes.
- `src/constants.ts` — `MAGIC_BYTES` and `CONFIG` (chunk sizes, KDF params). Don't change without bumping the header version — old ciphertexts would become unreadable.
- Used by `SecureC` and `dropply-web`.
- Tested with vitest + happy-dom.

#### `@cdlab996/uncrypto` — Cross-runtime crypto shim

- Two-file package: `crypto.node.ts` (Node `webcrypto`) and `crypto.web.ts` (browser `crypto`). Resolved at build via tsdown.
- Used wherever code runs in both Workers/browser and Node test runners.

#### `@cdlab996/tsconfig` — Shared TS configs

- `base.json` — strict, NodeNext, ES2017. Used by everything.
- `nextjs.json`, `hono.json`, `react-library.json`, `utils.json` — overlay presets per app type.

## Conventions

### Lint & format (Biome, not ESLint/Prettier)

- Single quotes, no semicolons, 2-space indent, `organizeImports: on`, formatter on by default in `.vscode/settings.json`.
- Non-default rules **at error level**:
  - `useImportType` (separated) — write `import type { X }` not `import { type X }`
  - `noFloatingPromises`, `noMisusedPromises` (nursery) — every async call must be awaited or explicitly handled
  - `noTsIgnore` — use `// @ts-expect-error` instead
  - `noDelete` — don't `delete obj.prop`
  - `useDateNow` — `Date.now()` not `new Date().getTime()`
  - `noRestrictedImports` for zod — **`import * as z from 'zod'`** is mandatory; `import { z } from 'zod'` will fail lint
- Per-app linter "domains" are scoped via `biome.json` `overrides`: `next` + `react` for the Next apps listed in `overrides[1].includes`, `vue` for `repo-changelog`. Other apps get the recommended-off baseline.
- `repo-changelog`, `byplay-log/src/database/**/*.{json,sql}`, `dropply-api/src/database/**/*.{json,sql}`, and parts of `packages/ui/src/{components,reactbits}/**/*.tsx` are **excluded from Biome** entirely.

### Dependency versions live in pnpm catalogs

`pnpm-workspace.yaml` defines two catalogs (`prod`, `dev`). Reference them as `"react": "catalog:prod"` / `"typescript": "catalog:dev"` in any package.json. Only add a literal version when the dep isn't in the catalog. Bumping a shared dep means editing `pnpm-workspace.yaml`, not each package.

### Cross-package imports use the workspace protocol

`"@cdlab996/utils": "workspace:*"`. Workspace packages built by tsdown (`utils`, `cipher`, `uncrypto`) ship from `dist/`; if you edit one and the consumer can't resolve a new export, rebuild it (`pnpm --filter <pkg> build`) or run `dev --watch`. `pnpm prepare` (auto-run after install) builds them in topological order.

### i18n

- Next-intl: `apps/<app>/messages/{en,zh}.json`. The generated `apps/*/messages/en.d.json.ts` is gitignored (see `.gitignore`) and excluded from Biome.
- `locale` segment in `app/[locale]/` (where present) is wired through `middleware.ts`.
- All user-facing strings should have keys in both `en.json` and `zh.json`.

### IDs

- `@cdlab996/genid` (catalog dep) is the standard ID generator across apps.
- Database tables in `dropply-api` and `byplay-log` use UUID v4 (or auto-increment for `playerLogs`).

### Soft delete

Drizzle tables share a `trackingFields` block: `createdAt`, `updatedAt` (auto-updated via `$onUpdateFn`), `isDeleted` (default 0). Never hard-delete; filter with `eq(table.isDeleted, 0)`.

### API response envelope (Workers)

Hono workers return `{ statusCode, message, stack? }` for errors (with `stack` only when `isDebug` is true) and route-specific shapes for success. The pattern is consistent across `dropply-api`, `byplay-log`, `live-user`. Global error/404 handlers are wired in each `index.ts`.

### Misc

- `nsl` proxy means the dev URL is **always** `http://<name>.localhost:3355`. Don't add port discovery code — it's handled.
- Scripts in `scripts/` are bash (`bash ./scripts/<name>.sh`).
- Turbo concurrency is set to 50 (`turbo.json`).
- Default formatter (`.vscode/settings.json`) is `biomejs.biome` for ts/tsx/json/jsonc/svelte/vue/astro; `mdx` is Prettier.
- `i18n-ally.localesPaths` in `.vscode/settings.json` lists every messages dir — keep this in sync if you add a new app with i18n.
