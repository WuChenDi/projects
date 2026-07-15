# SecureC — Design

> A zero-knowledge, client-only encryption tool. SecureC is a statically-exported
> Next.js SPA (`output: 'export'`) with **no backend of any kind**: all
> encryption and decryption run in the browser inside a Web Worker on top of
> [`@cdlab/cipher`](../../packages/cipher) (XChaCha20-Poly1305 + Argon2id, with an
> ECIES public-key mode). Plaintext and keys never leave the tab; the only network
> traffic is loading the app itself.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — source doc-comments and reviews reference them as
`design §N`.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The crypto worker](#3-the-crypto-worker)
4. [The orchestrator hook](#4-the-orchestrator-hook)
5. [Data model & storage](#5-data-model--storage)
6. [UI composition](#6-ui-composition)
7. [Internationalization & routing](#7-internationalization--routing)
8. [Configuration & deployment](#8-configuration--deployment)
9. [The ECIES key demo](#9-the-ecies-key-demo)

---

## 1. Background & goals

Encrypting a file is easy; doing it *without asking the user to trust a server*
is the whole point of SecureC. The common pattern — upload plaintext, let a server
encrypt and hold the key — puts the operator inside the trust boundary. SecureC
removes the server entirely.

- **G1 — Zero-knowledge.** Plaintext and keys never leave the browser. There is no
  API route, no server action, no Worker binding, no upload path (verify: `find
  wrangler*` is empty; `next.config.ts` sets `output: 'export'`).
- **G2 — Responsive under load.** Crypto (including memory-hard Argon2id) runs in a
  Web Worker so the main thread never blocks; large files stream in fixed-size
  chunks so memory stays flat regardless of file size.
- **G3 — Correct by construction.** Password mode uses a per-operation random salt
  and a memory-hard KDF; decryption self-describes via the cipher stream header
  (mode + original extension), so the user never has to remember which mode a blob
  needs.
- **G4 — Durable-enough history.** A user can reload and re-download a past result,
  but browser storage is best-effort: a missing payload degrades gracefully rather
  than corrupting state.

### Non-goals

- **Not a key/account system.** SecureC stores no password and no key. A lost
  password means unrecoverable ciphertext — by design.
- **Public-key (ECIES) mode is not in the UI.** The worker only exercises
  **password** mode. ECIES is a `@cdlab/cipher` capability demonstrated by the
  `gk` script (§9), not the encrypt/decrypt screen.
- **Not a backup service.** History is local browser storage, not durable storage.
- **No parallelism.** Batch files run one at a time through a single worker (§4).

---

## 2. Architecture

SecureC is a **three-layer client pipeline**. React only orchestrates; all crypto
is delegated across the `postMessage` boundary to one shared Web Worker.

```
        browser tab (no server)
  ┌──────────────────────────────────────────────────────────────┐
  │  React UI  (src/components/SC/*, src/app/[locale]/page.tsx)   │
  │      │  props / callbacks                                     │
  │      ▼                                                        │
  │  useCryptoProcessor  (src/hooks/useCryptoProcessor.ts)        │
  │      │  local state · batch loop · detect · download          │
  │      │  ┌──────────────► Zustand store (useProcessStore) ─────┼─► localStorage (metadata)
  │      │  │                        │                            │
  │      │  │                        └────────────────────────────┼─► IndexedDB (payloads)
  │      ▼  │  postMessage / onmessage                            │
  │  cryptoWorker  (src/workers/cryptoWorker.ts)  ── Web Worker ──┼
  │      │                                                        │
  │      ▼  streamCrypto / textCrypto / parseStreamHeader / detect│
  │  @cdlab/cipher  (XChaCha20-Poly1305 + Argon2id + ECIES)       │
  └──────────────────────────────────────────────────────────────┘
```

**Entry points.**

- `src/app/page.tsx` — root `/`; `redirect('/en')` (only renders in the static
  export, to bounce to the default locale).
- `src/app/layout.tsx` — pass-through root layout (present because root
  `not-found`/`error` boundaries exist).
- `src/app/[locale]/layout.tsx` — the real HTML shell: Geist fonts, SEO metadata +
  three JSON-LD blocks, Google Analytics (`gaId="G-VECVREEZT1"`),
  `NextIntlClientProvider`, `ClientProviders`, header, toaster.
  `generateStaticParams` pre-renders `en` and `zh`.
- `src/app/[locale]/page.tsx` — `PasswordPage`, the single functional screen: a
  two-column grid (`SCInputPanel` + `SCFeaturesSection` | `SCResultsPanel`) wired
  entirely through `useCryptoProcessor`.
- `src/middleware.ts` — next-intl locale middleware. **Inert under `output:
  'export'`** (no server to run it); routing is client-side.

**Static-export constraints.** With `output: 'export'` there is no server runtime:
`middleware.ts`, `not-found`/`error` server features, and any server action are
effectively decorative; `images.unoptimized: true` is mandatory; `metadataBase`
and canonical point at `securec.pages.dev`.

---

## 3. The crypto worker

**File:** `src/workers/cryptoWorker.ts`. This is the crypto engine boundary.
Instantiated once per hook via `new Worker(new URL('../workers/cryptoWorker.ts',
import.meta.url))` and `terminate()`d on unmount. One worker instance is **reused**
for every file and every text operation (§4).

### 3.1 Message protocol

**Inbound** (`postMessage`):

```ts
{ mode: 'ENCRYPT' | 'DECRYPT', file?, filename?, text?, password, isTextMode }
```

**Outbound** (`self.postMessage`) — four disjoint shapes (the hook branches on
`progress`, `data`, and `error`; a bare `{ stage }` is informational):

| Shape | Meaning |
| --- | --- |
| `{ progress, stage }` | progress tick (0–100) + human-readable stage string |
| `{ stage }` | stage-only update (from the cipher's `onStage` callback) |
| `{ data: { data: Blob, filename, base64?, originalExtension? } }` | terminal success |
| `{ error }` | terminal failure |

### 3.2 Branches

- **Encrypt file** — `streamCrypto.encrypt.withPassword({ file, password,
  onProgress, onStage })`. Raw cipher progress (0–100) is rescaled into a
  **10–95 % band** (`10 + p/100*85`, capped at 95); the final message posts
  `progress: 100` then the Blob. Output name via `generateDownloadFilename` →
  `<name>_<timestamp>.enc`.
- **Decrypt file** — first reads `file.slice(0, 2048)` with a `FileReader` and
  calls `parseStreamHeader(bytes, password)` to recover the original extension
  (`header.e`, defaulting to `bin`). Then `streamCrypto.decrypt.withPassword`
  (progress band **20–95 %**). Output name `<timestamp>.<ext>`.
- **Text encrypt** — `textCrypto.encrypt(text, password)` → `{ blob, base64 }`
  (Base64 is the user-facing output).
- **Text decrypt** — `textCrypto.decrypt(text.trim(), password)` → `{ text }`.

All work is wrapped in one try/catch that posts `{ error }` on any throw. The
10 MB stream chunking and the actual KDF/cipher parameters live **inside
`@cdlab/cipher`** (`streamCrypto`), not here — see that package's `constants.ts`.

> **Progress is a manually-rescaled composite**, not the cipher's raw value. If
> you change a band, keep encrypt (10–95) and decrypt (20–95) distinct — decrypt
> spends its first 20 % on the header read.

---

## 4. The orchestrator hook

**File:** `src/hooks/useCryptoProcessor.ts`. Everything the page needs comes from
this one hook: local UI state (`password`, `selectedFiles`, `fileInfos`,
`textInput`, `inputMode`, `activeTab`), the worker lifecycle, batching, auto-detect,
download, and store wiring.

### 4.1 Auto-detect

- `handleFileSelect` runs `detect(file)` (from `@cdlab/cipher`) on each added file;
  if any `encryptionType !== 'unencrypted'`, it flips `activeTab` to `DECRYPT`.
  `detect` reads only what it needs from the file, regardless of size.
- `handleTextInputChange` runs `detect(trimmed)` on pasted text ≥ 3 chars and
  flips to `DECRYPT` on a match. This is the public `setTextInput` returned to the
  page.

### 4.2 Batch model (files)

`processInput` (`InputModeEnum.FILE` branch):

1. Validates inputs (file present, password present), shows a toast.
2. Snapshots `selectedFiles`/`fileInfos`, then `clearInput()`.
3. **Creates one `ProcessResult` task per file upfront** (status `PROCESSING`,
   `data: ArrayBuffer(0)`, id from `genid.nextId()`), so all loading cards render
   immediately.
4. Loops `await processOneFile(...)` **sequentially** — one file at a time through
   the single shared worker. There is deliberately **no parallelism**.

`processOneFile` sets `worker.onmessage`, posts the file, and returns a Promise
that resolves on the terminal `data` message. On success it reads the Blob to an
`ArrayBuffer`, `URL.createObjectURL`s it, and `updateResult(..., COMPLETED)` with
`data`, `downloadUrl`, and `fileInfo`. On throw it marks the task `FAILED`.

> **Shared `onmessage` caveat.** Because the sole worker's `onmessage` is
> reassigned per task and files run strictly sequentially, messages never
> interleave. Preserve the sequential loop if you touch this — concurrent
> `postMessage`s to one worker would cross their handlers.

### 4.3 Text model

The `InputModeEnum.MESSAGE` branch is a **single, non-batched task**: one
`postMessage({ isTextMode: true })`, storing `text` (the Base64/plaintext result)
on the `ProcessResult` alongside the payload.

### 4.4 Download

`handleDownloadResult` uses `downloadFile` from `@cdlab/utils`, wrapping
`result.data` in a Blob. File results download under `fileInfo.name`; text results
under `encrypted_text_<ts>.enc` (encrypt) or `<ts>.txt` (decrypt).

---

## 5. Data model & storage

### 5.1 `ProcessResult` (`src/types/index.ts`)

```ts
interface ProcessResult {
  id: string                 // genid.nextId() (snowflake, @cdlab/driftflake)
  mode: ModeEnum             // ENCRYPT | DECRYPT
  inputMode: InputModeEnum   // FILE | MESSAGE
  data: ArrayBuffer          // the payload (0-length placeholder while PROCESSING)
  text?: string              // text-mode result (Base64 or plaintext)
  fileInfo?: FileInfo        // { name, size, type, originalExtension? }
  timestamp: number
  status: StatusEnum         // from @cdlab/ui/IK (PROCESSING | COMPLETED | FAILED)
  progress: number
  stage: string
  error?: string
  downloadUrl?: string       // object URL, revoked on remove/clear
}
```

`KeyPair` also exists in this file but is **unused in-app** (only relevant to
ECIES / the `gk` script).

### 5.2 Two-tier persistence

The store (`src/store/useProcessStore.ts`, Zustand + `persist`) is the processing
history. Persistence is deliberately split to dodge the ~5 MB `localStorage` cap:

| Tier | Key / store | Contents |
| --- | --- | --- |
| `localStorage` | `securec-process-results` | **metadata only**. `partialize` keeps only `COMPLETED` rows and strips the binary (`data: new ArrayBuffer(0)`, drops `downloadUrl`). |
| IndexedDB | `securec-process-data` | the real `ArrayBuffer` payloads, keyed by result id. Wrapped by `@cdlab/utils` `createIDBStore` in `src/lib/storage.ts` (one line). |

Writes: `addResult`/`updateResult` persist to IndexedDB via `dbStore.set(id, data)`
**only when `byteLength > 0`** (so the `PROCESSING` placeholder isn't written).
`removeResult`/`removeResults`/`clearResults` revoke the object URL and delete from
IndexedDB (`remove`/`removeBatch`/`clear`).

### 5.3 Rehydration

`rehydrateBlobs` runs from `onRehydrateStorage`: for each `COMPLETED` result it
fetches the payload from IndexedDB and rebuilds a fresh object URL. A **missing
payload** marks the row `FAILED` with `error: 'Data lost'` rather than crashing.
It merges into current state (`restoredMap.get(id) ?? r`) to avoid clobbering
concurrent mutations, then sets `isHydrated`. Any `persist` error still flips
`isHydrated` so the UI never hangs on a blank history. The page uses `isHydrated`
to avoid rendering stale/empty history before IndexedDB is ready.

### 5.4 ID generation

`src/lib/genid.ts` exports a single `GenidOptimized({ workerId: 1 })` from
`@cdlab/driftflake` — snowflake-style, monotonic, collision-free task IDs.

---

## 6. UI composition

App-specific components live in `src/components/SC/*` (barrel `index.ts`):

| Component | Role |
| --- | --- |
| `SCInputPanel` | Left column: mode tabs, file/text input mode, password field, file/text input, process button. |
| `SCEncryptDecryptTabs` | Encrypt/Decrypt tab control. |
| `SCFileInfoDisplay` | Selected-file chips (name/size/type). |
| `SCFeaturesSection` | Static feature blurb under the input panel. |
| `SCResultsPanel` | Right column: the history list + clear-all. |
| `SCResultCard` / `SCResultDialog` | Per-result card (progress, download, remove) + detail dialog. |
| `SCHeader` | Gradient hero title (`SecureC` + subtitle). Defined but **not currently mounted** — the shell header is `IKHeader` (see below). |

Shared shell in `src/components/layout/*`: `ClientProviders` (theme + tooltip +
animated gradient background + `IKVersionInfo` footer that surfaces `BUILD_TIME`),
`theme-provider`/`theme-toggle` (next-themes, **default dark**), `language-selector`.
The page-level nav header is `IKHeader` from `@cdlab/ui/IK` (wired in
`[locale]/layout.tsx` with `LanguageSelector` + `ThemeToggle`); the page body is
wrapped in `IKPageContainer`. The gradient background renders only after `mounted`
to avoid an SSR/hydration flash.

Presentation helpers: `src/lib/utils.ts`
(`getFileExtension`, `getFilenameWithoutExtension`, `clampProgress`,
`generateDownloadFilename` — the single source of truth for output naming) and
`src/lib/fileIconHelper.ts` (extension/MIME → icon + color + label for result
cards; pure presentation).

---

## 7. Internationalization & routing

- `src/i18n/routing.ts` — locales `['en', 'zh']`, default `en`.
- `src/i18n/request.ts` — loads `messages/<locale>.json`.
- `messages/en.json`, `messages/zh.json` — catalogs; `messages/en.d.json.ts` is the
  generated type declaration (via next-intl `createMessagesDeclaration`,
  configured in `next.config.ts`) and is gitignored + Biome-excluded.
- Root `/` → `redirect('/en')`; `generateStaticParams` pre-renders both locales at
  export time.

---

## 8. Configuration & deployment

### 8.1 Config knobs (`next.config.ts`)

| Knob | Value | Purpose |
| --- | --- | --- |
| `output` | `'export'` | Static export — no server runtime. |
| `images.unoptimized` | `true` | Required for static export. |
| `images.qualities` / `formats` / `remotePatterns` | — | `remotePatterns` allows `wcd.pages.dev` (logo); OG/screenshot images are served from `cdn.jsdelivr.net`. |
| `env.BUILD_TIME` | `new Date().toLocaleString()` | Footer version info. |
| `withNextIntl(createMessagesDeclaration)` | `./messages/en.json` | Typed i18n declarations. |

There are **no environment secrets, no Cloudflare bindings, and no runtime
config** — nothing to inject at deploy time.

`tsconfig.json` extends `@cdlab/tsconfig/nextjs.json`; aliases `@/*` → `src`,
`@cdlab/ui/*` → the shared UI package. `components.json` is the shadcn config
(style `radix-nova`, shared CSS + aliases from `@cdlab/ui`). `postcss.config.mjs`
wires Tailwind v4.

### 8.2 Build & deploy

| Script | Command | Result |
| --- | --- | --- |
| `dev` | `nsl run next dev` | dev server at `http://securec.localhost:3355` |
| `build` | `next build` | static export (because of `output: 'export'`) |
| `build:cf` | `next-on-pages` | Cloudflare Pages build |
| `typecheck` | `tsc --noEmit` | type gate |
| `lint` / `lint:fix` | `next lint` | lint |

Deployed to Cloudflare Pages at `https://securec.pages.dev/`. No migrations, no
secret sync, no bindings — deployment is publishing static assets.

There is **no test script** in this app; the cryptographic correctness tests live
in [`@cdlab/cipher`](../../packages/cipher) (vitest + happy-dom).

---

## 9. The ECIES key demo

`scripts/generateKeys.js` (`pnpm --filter @cdlab/securec gk`) is a **standalone
Node demo, not wired into the app**. It:

1. Derives BIP32 key pairs from two hardcoded mnemonics (`@scure/bip32` /
   `@scure/bip39`) at path `m/44'/0'/0'/0/0`.
2. Base58-encodes the public keys.
3. Runs an `eciesjs` encrypt/decrypt round trip between "alice" and "bob",
   printing to the console.

It documents `@cdlab/cipher`'s public-key (ECIES) mode — which the app UI does not
expose. Treat it as reference/example code, not product surface.

> **Metadata caveat.** `package.json`'s `description` and the SEO metadata /
> JSON-LD in `[locale]/layout.tsx` still say **"AES-GCM"**. The actual cipher is
> `@cdlab/cipher` = **XChaCha20-Poly1305 + Argon2id (+ ECIES)**. Trust this doc and
> the code, not the stale metadata strings, when describing the algorithm.
