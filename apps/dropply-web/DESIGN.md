# dropply-web — Design

> The client half of an end-to-end-encrypted file/text sharing pair. All
> encryption and decryption happen **in the browser**; the 256-bit key lives
> only in the URL fragment (`#key=…`), which is never sent to a server. The app
> is a **static export** (`output: 'export'`) — no server of its own — and talks
> to a single backend, [`dropply-api`](../dropply-api), which only ever stores
> ciphertext and metadata.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — source comments and reviews reference them as
`design §N`. The paired API's design is out of scope here; this document covers
the browser client only.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The crypto boundary](#3-the-crypto-boundary)
4. [Share (upload) pipeline](#4-share-upload-pipeline)
5. [Retrieve (download) pipeline](#5-retrieve-download-pipeline)
6. [Client state & storage](#6-client-state--storage)
7. [Auth (TOTP gate)](#7-auth-totp-gate)
8. [Security model](#8-security-model)
9. [Internationalization & theming](#9-internationalization--theming)
10. [Configuration & deployment](#10-configuration--deployment)

---

## 1. Background & goals

A file-sharing tool that uploads plaintext asks the user to trust the operator.
`dropply-web` removes that trust by moving the entire crypto boundary into the
browser: the server stores ciphertext it cannot read, and the only secret that
can decrypt it never reaches the server. The client holds itself to these goals:

- **G1 — Zero-knowledge server.** Encryption and decryption are 100% client-side.
  The 256-bit key is generated in the browser and shared only via the URL
  fragment (`#key=…`), which browsers never transmit. The server receives
  ciphertext + metadata, never plaintext or the key.
- **G2 — No durable key on the device.** The share history persists to
  `localStorage`, but the key field is stripped before writing. A stolen device
  cannot recover past keys from local storage.
- **G3 — Large files without large memory.** Files above the chunk threshold
  upload as bounded multipart parts, not one buffered blob, with per-part retry.
- **G4 — No server of its own.** The deployed artifact is static assets; there is
  no SSR, no route handler, no runtime backend to operate beyond `dropply-api`.
- **G5 — One knob to point at a backend.** The only build-time config is the API
  base URL; runtime behavior (size cap, TOTP, email) is fetched from the server.

### Non-goals

- **Not standalone.** Storage, TOTP verification, and email delivery all live in
  [`dropply-api`](../dropply-api); this app is inert without it.
- **Not a server runtime.** No SSR data fetching, no API routes, no edge/node
  functions — static export only (§2, §10).
- **Not key recovery.** Losing the fragment means the data is unrecoverable by
  design; the server holds no key to fall back on.

---

## 2. Architecture

```
                         browser (static assets from ./out)
  user ── Share tab ──►┌──────────────────────────────────────────┐
                       │ src/app/[locale]/page.tsx  (client UI)    │
  user ── Retrieve ───►│   ShareTab / RetrieveTab                  │
                       │   usePocketChest (orchestration hook)     │
                       │   crypto.ts  (@cdlab/cipher, in-browser)  │
                       └───────┬───────────────────┬──────────────┘
                               │ ciphertext + meta  │ key stays local
                               ▼                    (URL fragment only)
                        dropply-api  (the only backend: storage, TOTP, email)
```

**Static export.** `next.config.ts` sets `output: 'export'`: `next build`
prerenders everything to static HTML/JS in `./out`. There is no Next.js server,
no edge/node function, and no route handler. `src/middleware.ts` (next-intl
locale middleware) and `generateMetadata` run only during dev/build; the shipped
artifact is plain files. `generateStaticParams` in `[locale]/layout.tsx` emits
`en` and `zh`.

**Entry points.**

- `src/app/layout.tsx` — trivial root layout (passes children through; required
  because a root `not-found.tsx` exists).
- `src/app/page.tsx` — root page, `redirect('/en')` (only meaningful in export).
- `src/app/[locale]/layout.tsx` — the real layout: Geist fonts, EN + ZH SEO
  metadata (`generateMetadata`), 4 JSON-LD blocks, `NextIntlClientProvider`,
  `ClientProviders`, `IKHeader` (brand "Dropply"), `LanguageSelector`,
  `ThemeToggle`, `Toaster`.
- `src/app/[locale]/page.tsx` — **the entire app UI** (`'use client'`). Holds tab
  state (`share`/`retrieve`), fetches server config on mount, gates share behind
  TOTP, renders `ShareTab` / `RetrieveTab` inside `Tabs`, plus `EmailShare` and
  `TOTPModal`. Wrapped in `Suspense` because it reads `useSearchParams()`.

**Orchestration.** `src/hooks/usePocketChest.ts` is the single React hook that
sequences the API calls and owns progress/status state. `src/lib/api.ts`
(`PocketChestAPI`) is the sole HTTP client; `src/lib/crypto.ts` is the only place
crypto happens.

---

## 3. The crypto boundary

Everything in `src/lib/crypto.ts` runs in the browser; it is a thin wrapper over
[`@cdlab/cipher`](../../packages/cipher) (XChaCha20-Poly1305 stream + Argon2id
password KDF).

### 3.1 Key generation

`generateEncryptionKey()` reads 32 random bytes (`crypto.getRandomValues`) and
base64url-encodes them **without padding** (`+`→`-`, `/`→`_`, strip `=`). This
string is used as the *password* for Argon2id derivation, not as a raw symmetric key.
A share reuses a caller-supplied key if given (`finalKey = encryptionKey ||
generateEncryptionKey()`, `usePocketChest.ts`), else generates one.

### 3.2 URL-fragment contract

The key travels only in the location **hash**:

- `encodeKeyForUrl(key)` = `encodeURIComponent(key)`.
- `decodeKeyFromUrl(hash)` matches `key=([^&]+)` and `decodeURIComponent`s it;
  returns `null` if absent.

The share URL is built as
`` `${origin}${pathname}?code=${retrievalCode}#key=${encodeURIComponent(key)}` ``
(`ShareTab.tsx`). **Invariant:** the code goes in the query (server-visible), the
key goes in the fragment (never transmitted). `page.tsx` also parses the hash
synchronously in a `useState` initializer so the retrieve key is available on
first render (the fragment isn't in `useSearchParams`).

### 3.3 Encrypt / decrypt primitives

| Function | In → out | Backing call |
| --- | --- | --- |
| `encryptFile(file, password, onProgress)` | `File` → encrypted `Blob` | `streamEncryptWithPassword` (chunked stream) |
| `decryptFile(blob, password, filename)` | `Blob` → `Blob` | `streamDecryptWithPassword` |
| `encryptTextContent(text, password)` | `string` → base64 `string` | `textCrypto.encrypt` |
| `decryptTextContent(text, password)` | base64 `string` → `string` | `textCrypto.decrypt` |

Files are re-wrapped as `application/octet-stream` before/after so the ciphertext
MIME never leaks the original type to the server.

---

## 4. Share (upload) pipeline

**Entry:** `ShareTab` → `usePocketChest.uploadWithSession` →
`PocketChestAPI.uploadContent`. The flow, each stage able to short-circuit on
error:

```
1. api.getConfig()                     → { requireTOTP, emailShareEnabled, maxFileSize }   (on mount)
2. TOTP gate (if requireTOTP & no token) → prompt; validated by createChest(token)  (§7)
3. api.createChest(totpToken?)          → { sessionId, uploadToken }
4. encrypt EACH file / text item        → in-browser; counts as the FIRST 50% of per-file progress
5. driver split by size (CHUNK_SIZE=20MB):
     text items  → uploadContentRegular (one multipart FormData) FIRST
     small ≤20MB → rolling concurrency, max 3 parallel POST .../upload
     large >20MB → sequential per file; each file multipart (§4.2)
6. api.completeUpload(sessionId, uploadToken, fileIds, validityDays)  → { retrievalCode, expiryDate }
7. build share URL (§3.2); push { id, retrievalCode, encryptionKey, shareUrl, timestamp } to useShareStore
```

### 4.1 Driver selection & concurrency

`uploadContent` (`api.ts`) computes `smallFiles ≤ 20MB` and `largeFiles > 20MB`
**from the encrypted sizes** (encryption runs first, so the split reflects the
ciphertext). Two independent concurrency layers:

- **File-level (small files):** a rolling worker pool, `MAX_CONCURRENT_SMALL_FILES
  = 3`. As each `uploadNextFile` finishes it pulls the next index until the queue
  drains — at most 3 files in flight.
- **Part-level (within one large file):** `concurrencyLimit = min(3, totalParts)`
  parts uploaded per batch. **Large files themselves upload one at a time**
  (sequential `for` loop), so the peak is 3 parts of a single file, never 3 files.

### 4.2 Multipart upload (`uploadLargeFile`)

A large file is split into 20 MB slices and uploaded as an S3-style multipart:

```
createMultipartUpload   → { fileId, uploadId }   (uploadId is itself a JWT = multipartToken)
for each batch of ≤3 parts:
   uploadPart(sessionId, multipartToken, fileId, partNumber, arrayBuffer)   → { etag }
      retry up to MAX_RETRIES=3 with linear backoff (1000ms × attempt), progress reset on retry
completeMultipartUpload(sessionId, multipartToken, fileId, sortedParts)     → { fileId, filename }
```

**Two distinct tokens:** the chest `uploadToken` (from `createChest`) authorizes
`create` and the regular upload; the `multipartToken` (the `uploadId` a
create returns, a JWT) authorizes every `uploadPart` and the `complete` call.
Parts are collected as `{ partNumber, etag }`, sorted by number before complete.

### 4.3 Progress accounting

Progress is manual and stateful (`fileProgressMap`, keyed by filename / `text-N`):

- **Encrypting is the first 50%** of a file's bar (`Math.round(pct / 2)`); once
  encrypted, `totalBytes` is **replaced with the ciphertext size** and the bar
  resets to 0 for the upload phase, so byte counts stay accurate.
- Per-file status is a small machine:
  `waiting → encrypting → waiting → starting → uploading → finalizing → completed`
  (or `error`). `calculateTotalProgress` sums completed part sizes plus
  in-flight part bytes for the overall bar.
- **XHR vs fetch split:** `uploadContentRegular` / `uploadPart` use
  `XMLHttpRequest` **only when an `onProgress` callback is present** — `fetch`
  cannot report upload progress. With no callback they fall back to `fetch`.

### 4.4 Cancel / retry

`usePocketChest` holds an `AbortController`. `cancelUpload` aborts and resets all
progress state; `retryUpload` aborts any in-flight upload, clears state, and
re-invokes `uploadWithSession` with the same key so the resulting share URL is
stable.

---

## 5. Retrieve (download) pipeline

**Entry:** `RetrieveTab` → `usePocketChest.retrieve`. `page.tsx` reads `?code=`
from `useSearchParams` and `#key=` synchronously from `window.location.hash`; if
a code is present the initial tab is `retrieve`.

```
1. api.retrieveChest(code)             → { files, chestToken, expiryDate }
2. for each file:
     isText → GET /api/download/:fileId (Bearer chestToken) → decryptTextContent → content (inline)
     binary → deferred; downloaded on demand
3. store { files, chestToken, expiryDate } in useRetrieveStore (text bodies to IndexedDB, §6)
4. downloadSingleFile(fileId, chestToken, filename, key):
     api.downloadFile → Blob → decryptFile → triggerDownload (browser save)
```

Text items are decrypted **eagerly** during retrieve (so previews render);
binary files are decrypted **lazily** per download to avoid holding large
plaintext blobs in memory. All download requests carry `Authorization: Bearer
<chestToken>` — a short-lived token scoped to the retrieved chest.

---

## 6. Client state & storage

Three Zustand stores; there is **no backend DB in this app** (that is
`dropply-api`). API type contracts live in `src/types/index.ts`.

| Store | Shape | Persistence | Security rule |
| --- | --- | --- | --- |
| `useShareStore` | `ShareResult { id, retrievalCode, encryptionKey, shareUrl, timestamp }` | `localStorage` `dropply-share-results` | **`partialize` rewrites `encryptionKey` to `''`** before persisting — the key is never written to disk (§8). |
| `useRetrieveStore` | `RetrieveResult { id, retrievalCode, encryptionKey, files[], chestToken, expiryDate, timestamp }` | `localStorage` `dropply-retrieve-results` | **`partialize` strips text `content`** from files; bodies go to IndexedDB instead (below). |
| `useAuthStore` | `{ totpToken }` | **`sessionStorage`** `dropply-auth` | TOTP token is **session-scoped**, not durable — closing the tab forgets it (§7). |

### 6.1 Text bodies in IndexedDB

Decrypted text content is **not** kept in `localStorage` (size + exposure).
`src/lib/storage.ts` creates `dbStore = createIDBStore<string>(
'dropply-retrieve-data', 'text-contents')` (from `@cdlab/utils`). `addResult`
writes each text body keyed `` `${resultId}:${fileId}` ``; `removeResult` /
`clearResults` clean the matching IDB keys.

### 6.2 Rehydration race guard

`onRehydrateStorage` calls `rehydrateTextContents()`, which reloads bodies from
IDB back into the in-memory results and sets `isHydrated = true`. The UI waits on
`isHydrated` before rendering retrieved text. **Errors still set `isHydrated =
true`** so a failed reload can't deadlock the UI.

### 6.3 Local IDs

`src/lib/genid.ts` = `GenidOptimized({ workerId: 1 })` from
`@cdlab/driftflake` — snowflake-style IDs for local result rows (`id:
String(genid.nextId())`), independent of the server's `retrievalCode`.

---

## 7. Auth (TOTP gate)

TOTP is an **optional, server-configured** gate on the Share tab only; retrieval
is never gated.

- On mount, `page.tsx` reads `requireTOTP` from `GET /api/config`. If false, or a
  token already exists in `useAuthStore`, share unlocks immediately.
- When required and no token, `ShareTab` shows a lock; `TOTPModal` collects a
  code. **There is no dedicated verify endpoint** — `handleTOTPSubmit` validates
  by calling `api.createChest(token)`; success stores the token (sessionStorage)
  and unlocks share.
- `handleAuthExpired` clears the token, re-locks share, and re-prompts. Because
  the token lives in `sessionStorage`, it is forgotten when the tab closes.

The token is carried on `createChest` (`{ totpToken }` body) and every server-side
TOTP check happens in `dropply-api`.

---

## 8. Security model

- **Zero-knowledge (G1).** No plaintext or key ever reaches the network. Crypto
  is client-side; the key rides the URL fragment, which browsers do not send.
- **Key never persisted (G2).** `useShareStore.partialize` blanks `encryptionKey`
  before it hits `localStorage`. In-memory results keep the key for the session;
  disk never does. **Do not change this partialize without understanding it
  defeats the whole threat model.**
- **Least-plaintext-at-rest.** Retrieved binary files are decrypted per-download,
  not all at once; text bodies live in IndexedDB (evictable, origin-scoped), not
  `localStorage`.
- **Session-scoped auth.** The TOTP token is `sessionStorage`, so it neither
  survives a tab close nor leaks into durable storage.
- **Ciphertext MIME.** Files are uploaded as `application/octet-stream`, so the
  server never learns the original content type from the blob.
- **Static-export caveat.** `nodejs_compat` is set in `wrangler.jsonc` for the
  `next-on-pages` build path even though the deployed app is static — **do not
  assume Node APIs exist** in the client bundle.

Trust boundary: everything the server sees (retrieval code, chest token,
ciphertext, sizes, MIME `octet-stream`, expiry) is non-secret. The single secret
is the fragment key, held only by whoever has the full share URL.

---

## 9. Internationalization & theming

- **i18n:** next-intl. `src/i18n/routing.ts` declares locales `['en','zh']`,
  default `en`; `request.ts` loads `messages/{locale}.json`; `navigation.ts`
  gives locale-aware `Link`/router. `LanguageSelector` switches locale.
  `messages/en.d.json.ts` (typed messages) is generated (`next.config.ts`
  `createMessagesDeclaration`) and gitignored.
- **Theming:** `ClientProviders` wraps `ThemeProvider` with **default `dark` and
  `enableSystem={false}`**, a `TooltipProvider`, an animated gradient background
  (per-theme), and `IKVersionInfo` (package name/version + build `BUILD_TIME`).
  `ThemeToggle` flips light/dark.

---

## 10. Configuration & deployment

### 10.1 Config

The only build-time env var is `NEXT_PUBLIC_API_URL` (read once in `api.ts`,
default `''` = same-origin relative `/api`, which nsl serves in dev;
`.env.example` points it at a Worker URL for production). It is inlined into the
static bundle at build time — changing it requires a rebuild.
All *behavioral* config (`requireTOTP`, `emailShareEnabled`, `maxFileSize`) is
fetched at runtime from `GET /api/config`, so the deployed static bundle adapts
to the server without a rebuild. Client default `maxFileSize` fallback is
`100 MB`.

Hardcoded tuning (change in `src/lib/api.ts` / `ExpirySelector.tsx`):
`CHUNK_SIZE = 20 MB`, `MAX_CONCURRENT_SMALL_FILES = 3`, part `concurrencyLimit =
min(3, totalParts)`, `MAX_RETRIES = 3` (linear `1000ms × attempt`), expiry steps
`[1,2,3,4,5,6,7,14,30,90,180,365]` days (default `7`).

### 10.2 Build

`next build` produces a static `out/` because of `output: 'export'`. Images are
`unoptimized`; remote hosts `res.cloudinary.com` and `wcd.pages.dev` are
allowlisted (`next.config.ts`). `BUILD_TIME` is injected at build via
`next.config.ts` `env`.

### 10.3 Deploy

Two coexisting paths:

- **Static assets (primary).** `wrangler.jsonc` serves `./out` directly
  (`assets.directory`, `not_found_handling: "404-page"`,
  `compatibility_flags: ["nodejs_compat"]`, `compatibility_date: 2026-05-04`).
  Live at `dropply.pages.dev`.
- **`next-on-pages`.** `pnpm --filter @cdlab/dropply-web build:cf` runs
  `@cloudflare/next-on-pages` for a Cloudflare Pages build.

There are **no Cloudflare bindings** — no KV/R2/D1/DO. The app is a static asset
deployment that depends solely on a reachable `dropply-api`.

### 10.4 Commands

```bash
pnpm --filter @cdlab/dropply-web dev        # nsl → http://dropply-web.localhost:3355
pnpm --filter @cdlab/dropply-web lint       # next lint
pnpm --filter @cdlab/dropply-web typecheck  # tsc --noEmit
pnpm --filter @cdlab/dropply-web build       # static out/
pnpm --filter @cdlab/dropply-web build:cf    # Cloudflare Pages build
```

No test script and no test files exist in this app.
