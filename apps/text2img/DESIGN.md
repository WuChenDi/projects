# text2img — Design

> A free, no-registration AI text-to-image tool that runs as a single Cloudflare
> Worker (Next.js App Router compiled through OpenNext). The browser POSTs a
> prompt to `/api/generate`; the Worker resolves a model, runs it through a
> per-model **adapter** onto the Cloudflare Workers AI binding (`env.AI.run`),
> and streams a PNG back. There is no server-side database — generation history
> is browser-local (IndexedDB blobs + localStorage metadata), and the optional
> access password is Argon2id-hashed client-side so plaintext never crosses the
> wire.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — reference them as `design §N`.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The generate request](#3-the-generate-request)
4. [Model adapters](#4-model-adapters)
5. [Model catalog & prompts](#5-model-catalog--prompts)
6. [Client history & storage](#6-client-history--storage)
7. [Password gate](#7-password-gate)
8. [Image inputs (img2img / inpainting)](#8-image-inputs-img2img--inpainting)
9. [UI, i18n & SEO](#9-ui-i18n--seo)
10. [Configuration & deployment](#10-configuration--deployment)

---

## 1. Background & goals

Generating an image from a text prompt is a one-line call to Cloudflare Workers
AI — but Workers AI models do **not** share an input or output shape. Some take
plain JSON; FLUX models want a `multipart` FormData body and answer with base64
JSON; image-to-image models want a byte array. Wrapping that behind a stable UI,
without an account or a server database, is the whole job.

`text2img` holds itself to these goals:

- **G1 — Zero friction.** No sign-up, no credits, no server-stored user data. The
  only cost is the operator's own Workers AI usage.
- **G2 — One request shape, many models.** The client sends the same
  `GenerateParams` regardless of model; all per-model divergence is isolated in a
  server-side adapter (§4).
- **G3 — Local-first history.** Results (image bytes + params) persist in the
  browser and survive a reload, without ever being uploaded.
- **G4 — Secrets never leak.** The optional access password is hashed
  client-side; the plaintext is never transmitted, logged, or persisted (§7).
- **G5 — One binary.** Next.js → OpenNext → a single Worker; the Workers AI
  binding is the only hard dependency.

### Non-goals

- **No server-side persistence.** No database, no accounts, no cross-device sync —
  history is browser-local (§6).
- **Not an image editor.** img2img / inpainting are model *inputs* (client-side
  canvas resize), not an editing canvas.
- **Not a job queue.** One generation per request — no server-side retry,
  batching, or job persistence.

---

## 2. Architecture

```
                         Cloudflare edge
  browser ── /[locale] ──►┌────────────────────────────────────────┐
   (UI page)              │ text2img Worker (.open-next/worker.js)  │
                          │  fetch → OpenNext → Next.js App Router  │
  browser ─ POST /api ───►│    /api/generate  → env.AI.run          │
                          │    /api/models    → static catalog      │
                          │    /api/prompts   → static prompts      │
                          └───────────────┬─────────────────────────┘
                                          │
                                   AI (Workers AI binding)
                                   ASSETS (static output)

  browser-local (no server DB):
    IndexedDB  text2img-images   — generated PNG blobs, keyed by result id
    localStorage text2img-results — completed-result metadata (Zustand persist)
```

The Worker has two surfaces, both unauthenticated by default:

- **UI** — `src/app/[locale]/page.tsx` (`Home`, a client component) wrapped by
  `src/app/[locale]/layout.tsx`. Locales `en` / `zh` (default `en`), routed by
  the next-intl middleware whose matcher excludes `/api`, `/_next`, `/_vercel`,
  dotted files, and image-metadata routes (`src/middleware.ts`).
- **API** — the three route handlers under `src/app/api/*`.

**Runtime.** This is not the classic Next edge runtime — there are no
`export const runtime` declarations. OpenNext emits `.open-next/worker.js`
(`wrangler.jsonc:main`), which runs on the Workers `nodejs_compat` runtime.
`getCloudflareContext()` (from `@opennextjs/cloudflare`) yields the `env` (and the
`AI` binding) inside a request; in `next dev` it works only because
`next.config.ts` calls `initOpenNextCloudflareForDev()`.

**Root shims.** `src/app/page.tsx` (`redirect('/en')`) and the pass-through root
`src/app/layout.tsx` exist only to satisfy Next's static-export and `not-found`
requirements; real routing lives under `[locale]`.

---

## 3. The generate request

**Entry:** `src/app/api/generate/route.ts` (`POST`). The full round-trip spans the
client mutation and the server handler.

### 3.1 Client side (`src/lib/hooks/useGeneration.ts`)

A TanStack `useMutation` wraps `generateImage`:

1. `onMutate` — mints an id via `genid.nextId()` (§ `src/lib/genid.ts`), records
   `performance.now()`, and inserts a `PENDING` record into the Zustand store.
2. `generateImage` — if a password is present, replaces it with
   `hashPasswordFn(password)` (Argon2id, `@cdlab/utils`) **before** POSTing JSON
   to `/api/generate`. The response is consumed as a `Blob`. A non-OK response
   with a JSON body throws its `error` string.
3. `onSuccess` — `completeResult(id, blob, generationTime)` (elapsed via
   `performance.now()`), toasts success. `onError` — marks the record `FAILED`
   and toasts the message.

`onGenerateClick` (`page.tsx`) builds `GenerateParams` and conditionally attaches
`image_b64` (non-`text2img` model) / `mask_b64` (`inpainting` model).

### 3.2 Server side (`route.ts` `POST`)

```
POST /api/generate  { prompt, model, password?, params… }
  1. parse JSON body                                       → GenerateParams
  2. env = getCloudflareContext().env                      → AI binding
  3. PASSWORDS gate (§7)                                    → 401 / 403 or continue
  4. require prompt AND model in body                       → 400 if missing
  5. findModelById(AVAILABLE_MODELS, model)                 → 400 unknown
  6. selectedModel.disabled?                                → 400 disabled
  7. adapter = MODEL_TYPE_CONFIGS[type]
             ?? MODEL_GROUP_CONFIGS[group]
             ?? defaultModelConfig                          (§4)
  8. inputs = adapter.prepareInputs(data)
  9. response = await env.AI.run(model.key, inputs)         model.key is the @cf/… id
 10. return adapter.processResponse(response)               → image/png (or JSON 500)
```

Any thrown error in steps 8–10 is caught and returned as
`{ error: 'Image generation failed', details }` with status `500`.

---

## 4. Model adapters

The adapter is the core abstraction. Each is a
`{ prepareInputs, processResponse }` pair (`interface ModelConfig`). Selection is
a **precedence chain** (`route.ts`):

```
MODEL_TYPE_CONFIGS[selectedModel.type]          // img2img | inpainting — WINS
  ?? MODEL_GROUP_CONFIGS[selectedModel.group]   // black-forest-labs | bytedance | …
  ?? defaultModelConfig
```

### 4.1 Precedence invariant

**Type config overrides group config.** A `runwayml`-group model whose `type` is
`img2img` uses `img2imgConfig`, *not* the `runwayml` group's `defaultModelConfig`.
This is what lets image models coexist with text2img models in the same group map
without a special case in the handler.

### 4.2 The adapters

| Adapter | Bound to | `prepareInputs` | `processResponse` |
| --- | --- | --- | --- |
| `defaultModelConfig` | `bytedance`, `lykon`, `stabilityai`, `runwayml` groups | plain JSON: `prompt` (default `'cyberpunk cat'`), `negative_prompt`, `height`/`width` 1024, `num_steps` 20, `strength` 0.1, `guidance` 7.5, random `seed` | returns raw response bytes as `image/png` |
| `blackForestLabsConfig` | `black-forest-labs` group | **schnell:** `{ prompt, steps }` with `steps` clamped to **4–8**. **Other FLUX:** builds a **`multipart` FormData** body and passes `{ multipart: { body, contentType } }` to `env.AI.run` | expects JSON with a base64 `image` field → `atob` → `Uint8Array` → PNG; malformed / missing image → JSON `500` |
| `leonardoConfig` | `leonardo` group (disabled) | `steps` 25, `guidance` 4 | accepts a base64 **string** or binary; unwraps `response.result` / `.image` |
| `img2imgConfig` | `img2img` type | decodes `image_b64` via `base64ToUint8Array` into a **number-array** `image` field; defaults 512×512, `strength` 0.75 | base64 or binary → PNG |
| `inpaintingConfig` | `inpainting` type | as img2img plus a `mask` decoded from `mask_b64`, `strength` 1 | reuses `img2imgConfig.processResponse` |

### 4.3 The FLUX multipart quirk

This is the single largest per-model divergence and the reason the adapter layer
exists. `flux-1-schnell` takes a minimal JSON body. **Every other FLUX model**
requires the input to be a `multipart` FormData body — `prepareInputs` constructs
a `FormData`, wraps it in a throwaway `Request` to obtain the body stream +
`content-type`, and hands `{ multipart: { body, contentType } }` to `env.AI.run`.
Their output is base64 JSON that must be decoded manually. SDXL / DreamShaper, by
contrast, return raw PNG bytes. Do not "simplify" these into one path — they are
genuinely different Workers AI contracts.

### 4.4 Steps clamp

`flux-1-schnell` clamps `num_steps` into `[4, 8]` (`>=8 → 8`, `<=4 → 4`);
all other adapters pass the requested step count through.

---

## 5. Model catalog & prompts

`src/lib/data.ts` hardcodes two arrays; `/api/models` and `/api/prompts` are
trivial `NextResponse.json` of them (`api/models/route.ts`,
`api/prompts/route.ts`). The client loads both via TanStack `useQuery`
(`staleTime` 5min / `gcTime` 10min, `page.tsx`).

- `AVAILABLE_MODELS: ModelGroup[]` — grouped by provider. Each `Model` has
  `id`, `name`, `description`, `key` (the full `@cf/...` Workers AI id passed to
  `env.AI.run`), `group`, `type` (`text2img` | `img2img` | `inpainting`), and
  `disabled`.
- `RANDOM_PROMPTS: string[]` — the one-click random-prompt library.

**Enabled:** FLUX.2 klein 9B / 4B, FLUX.2 dev, FLUX.1 schnell (all
`black-forest-labs`), ByteDance SDXL Lightning, Lykon DreamShaper 8 LCM,
Stability SDXL Base 1.0, Runway v1.5 img2img / inpainting. **Disabled:** Leonardo
Lucid Origin / Phoenix 1.0.

`findModelById` (`src/lib/utils.ts`) flattens the groups and returns the first
`id` match, else `null`.

### 5.1 Disabled ≠ absent

Disabled models stay in the catalog, so `/api/models` still lists them and the UI
can show them greyed. The gate is at generate time: `selectedModel.disabled`
returns a `400`. Enabling a model is a one-field flip in `data.ts` — no other
change needed if it fits an existing group/type adapter.

> Model `description` strings in `data.ts` are currently Chinese-only; they are
> display copy for the model picker, not part of any contract.

---

## 6. Client history & storage

There is **no server database**. History is split across two browser stores so
that large / sensitive data never lands in localStorage.

### 6.1 The two stores

- **IndexedDB** — `createIDBStore<Blob>('text2img-images')` (`src/lib/storage.ts`),
  keyed by result id, holds the generated PNG blobs.
- **localStorage** — the Zustand `persist` store keyed `'text2img-results'`
  (`src/store/useImageStore.ts`) holds lightweight metadata.

### 6.2 `GenerationResult`

`{ id, status(pending|completed|failed), params, imageUrl?, error?, generationTime? }`
(`src/types/index.ts`). `imageUrl` is a session-only object URL, never persisted.

### 6.3 Persist / rehydrate cycle

- **`partialize`** persists **only `COMPLETED`** results, and strips `imageUrl`,
  and from `params` the `password`, `image_b64`, and `mask_b64` fields — so no
  secret or source-image bytes reach localStorage.
- **`onRehydrateStorage`** → `rehydrateBlobs()` re-reads each blob from IndexedDB
  and rebuilds an object URL. A blob missing from IndexedDB marks the record
  `FAILED` with `'Data lost'`.

### 6.4 Object-URL lifecycle

Object URLs are created on completion / rehydrate and **revoked** on
`removeResult` / `clearAll`, keeping them session-scoped and leak-free. The
corresponding IndexedDB entry is removed alongside.

---

## 7. Password gate

Optional, controlled by `PASSWORDS` (§10). The design keeps the plaintext
entirely client-side.

1. **Client** (`useGeneration.ts`) — `hashPasswordFn(password)` (Argon2id) runs
   before the POST; the wire only ever carries the hash.
2. **Server** (`route.ts`) — reads `process.env.PASSWORDS`, splits on `,`, trims,
   drops empties. If the list is non-empty:
   - missing `password` → `401`;
   - otherwise `verifyPasswordFn(submittedHash, candidate)` is tried against each
     configured **plaintext**; a match authorizes, no match → `403`.
   - A malformed hash throws inside `verifyPasswordFn` and is swallowed as a
     mismatch — a bad client can't crash the handler.
3. Empty `PASSWORDS` → the gate is skipped entirely (open access).

The password is also stripped from persisted params (§6.3), so it never survives
in localStorage either.

---

## 8. Image inputs (img2img / inpainting)

For non-`text2img` models the UI shows `ImageUpload`
(`src/components/page/ImageUpload.tsx`):

- A source image is required; `inpainting` adds a mask drop-zone.
- Files are validated as images and capped at **10 MB** pre-resize.
- `resizeAndConvertToBase64` canvas-resizes to **≤512px** on the longest edge
  (SD v1.5 native resolution), re-encodes as PNG, and returns the bare base64
  (data-URL prefix stripped).
- The base64 is held in page state and attached as `image_b64` / `mask_b64` only
  when the model type warrants it (`onGenerateClick`).

Server-side, `img2imgConfig` / `inpaintingConfig` decode these via
`base64ToUint8Array` into the `image` / `mask` fields Workers AI expects. Source
and mask bytes are **never persisted** (stripped in §6.3).

---

## 9. UI, i18n & SEO

- **UI.** `Home` (`page.tsx`) is one client page: `BasicSettings` (prompt / model
  / password), `ImageUpload`, `AdvancedOptions` (width, height, steps, guidance,
  seed), and `ImageResult` history. Default state: prompt `'cyberpunk cat'`, model
  `'flux-1-schnell'`, 1024×1024, 20 steps, guidance 7.5. `genid.nextNumber()`
  supplies random seeds.
- **Providers.** `client-providers.tsx` composes `QueryClientProvider` (a
  per-mount `QueryClient`), `ThemeProvider` (default `"dark"`, `enableSystem`),
  `TooltipProvider`, and a theme-reactive gradient background; `IKVersionInfo`
  renders `BUILD_TIME`.
- **i18n.** next-intl: `routing.ts` (locales `en`/`zh`, default `en`),
  `request.ts` loads `messages/{locale}.json`. Strings live in both `en.json` and
  `zh.json` (typed `en.d.json.ts`, gitignored).
- **SEO.** `[locale]/layout.tsx` emits full bilingual `Metadata` (OpenGraph /
  Twitter, `metadataBase` `https://text2img.cdlab.workers.dev/`) plus four
  JSON-LD blocks (WebSite, WebApplication, BreadcrumbList, SoftwareApplication).
  `dateModified` is computed at render; `softwareVersion` / `datePublished` and
  the aggregate rating are hardcoded — update them deliberately.

---

## 10. Configuration & deployment

### 10.1 Config

There are no runtime `vars`. The only runtime knob is `PASSWORDS`
(`process.env.PASSWORDS`, §7); `BUILD_TIME` is an optional display value. Both are
env vars, not `wrangler` vars — see §10.3.

### 10.2 Bindings (`wrangler.jsonc`)

| Binding | Type | Use |
| --- | --- | --- |
| `AI` | Workers AI | `env.AI.run` — the core dependency. |
| `ASSETS` | Static assets | `.open-next/assets`. |
| `IMAGES` | Cloudflare Images | Declared, unused in code. |
| `WORKER_SELF_REFERENCE` | Service → `text2img` | Self-service binding. |

`compatibility_date` 2026-05-04; flags `nodejs_compat`,
`global_fetch_strictly_public`; observability on (head sampling 1.0).
`next.config.ts` sets `images.unoptimized` and `remotePatterns` for
`wcd.pages.dev` + `developers.cloudflare.com` (model provider icons / logo).
`open-next.config.ts` is the default `defineCloudflareConfig({})` (R2 incremental
cache commented out).

### 10.3 Why `PASSWORDS` is not a var

`PASSWORDS` is credential-valued. As a `wrangler` var it would be re-declared on
every deploy and **shadow** the Worker secret of the same name — the deploy
replaces the binding set, wiping the secret. So it is defined **only** as a
Worker secret: locally via `.env` (`.env.example` seeds `PASSWORDS=`), in prod via
the deploy workflow syncing GitHub secret `TEXT2IMG_PASSWORDS` **after** the
deploy. `wrangler.jsonc` carries an inline comment stating this.

### 10.4 Build & deploy

- `dev` — `nsl run next dev` (`http://text2img.localhost:3355`), real bindings via
  `initOpenNextCloudflareForDev()`.
- `build` — `next build` (type-check + bundle only; **not** the deploy path).
- `deploy` — `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
- `preview` — `opennextjs-cloudflare build && preview` (local Workers preview).
- `cf-typegen` — `wrangler types` → `cloudflare-env.d.ts` (`CloudflareEnv`).

Deploys run through the `deploy-text2img.yml` GitHub workflow (manual dispatch):
build & deploy, then a **post-deploy** `wrangler secret bulk` sync of
`TEXT2IMG_PASSWORDS` (empty values skipped, so an unset secret never wipes an
existing one). The local `deploy` script skips that sync — prefer the workflow.
There are no tests (no test script, no test files).
