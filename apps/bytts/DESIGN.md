# bytts — Design

> A free, browser-based text-to-speech tool. Two Edge routes proxy Microsoft's
> free "Edge Read Aloud" speech pipeline (SSML in, `audio/mpeg` out) and gate an
> optional password; everything else — voice / rate / pitch controls, long-text
> splitting, generation history, and a pluggable provider registry — runs in the
> browser with no server database. Persistence is split by size: audio blobs go
> to IndexedDB, metadata to localStorage.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — reference them as `design §N`.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The synthesis proxy (`/api/tts`)](#3-the-synthesis-proxy-apitts)
4. [SSML assembly & injection defense](#4-ssml-assembly--injection-defense)
5. [Text segmentation](#5-text-segmentation)
6. [Providers & the API manager](#6-providers--the-api-manager)
7. [Client storage & history](#7-client-storage--history)
8. [Access gate](#8-access-gate)
9. [Configuration & deployment](#9-configuration--deployment)

---

## 1. Background & goals

Neural TTS is normally locked behind a paid cloud SDK (Azure Cognitive Services)
or a native app. `bytts` exposes the same neural voices as a zero-config web app,
holding to these goals:

- **G1 — Free & keyless by default.** The built-in voice must synthesize without
  any user-supplied Azure key or account.
- **G2 — Long text, one click.** Text far beyond a single request must split,
  synthesize, and re-merge transparently into one clip.
- **G3 — Local-only data.** Generated audio and history never leave the browser;
  there is no server database and no telemetry.
- **G4 — Bring-your-own backend.** Any OpenAI-format or Edge-format TTS endpoint
  can be added and switched to, and the built-ins can be overridden in place.
- **G5 — Injection-safe synthesis.** The `/api/tts` route is unauthenticated and
  internet-facing; user text must not be able to inject arbitrary SSML.

### Non-goals

- **Not access control.** The password gate (§8) hides the UI, not the API — it
  is convenience, not a security boundary. `/api/tts` is intentionally open.
- **Not an official Azure integration.** The built-in provider uses a
  reverse-engineered free endpoint (§3), not a subscription key. Availability is
  best-effort; guaranteed uptime means bringing your own provider (§6).
- **Not voice cloning / custom voices.** It only drives voices the chosen backend
  already exposes.
- **No server state.** No accounts, no DB, no cross-device sync.

---

## 2. Architecture

```
                       browser (all persistence)
  user ─ text/voice ─►┌───────────────────────────────────────────┐
                      │ TTSForm ─ splitText ─ ttsRequest (mutation)│
                      │ useApiStore (providers)  useHistoryStore   │
                      │ IndexedDB (blobs)  localStorage (metadata) │
                      └───────┬──────────────────────┬────────────┘
                              │ POST /api/tts         │ POST <custom provider>
                              ▼                       ▼
               ┌──────────────────────────┐   external OpenAI/Edge TTS APIs
               │ Edge Runtime routes       │   (oai-tts.zwei.de.eu.org, BYO)
               │  /api/tts   → MS speech   │
               │  /api/config → password   │
               └───────────┬──────────────┘
                           ▼
        dev.microsofttranslator.com/apps/endpoint   (token, HMAC-signed)
        {region}.tts.speech.microsoft.com/…/v1      (SSML synthesis)
```

- **Framework:** Next.js **App Router**, React 19 + TypeScript. Pages/layout are
  server-rendered; all interactive UI is `'use client'`.
- **Server surface:** exactly two routes, both `runtime = 'edge'` —
  `src/app/api/tts/route.ts` (synthesis) and `src/app/api/config/route.ts`
  (password). No other server code, no bindings, no database.
- **Entry:** `src/app/layout.tsx` wires fonts, SEO/JSON-LD, and
  `ClientProviders` → `PasswordGate` → header + page + `Toaster`. The gate is
  seeded server-side via `!!process.env.ACCESS_PASSWORD`.
- **Home:** `src/app/page.tsx` — a resizable split of `TTSForm` (left, input +
  controls) and `HistorySection` (right, results).
- **Providers:** `src/components/layout/client-providers.tsx` — TanStack Query,
  `next-themes` (default dark), tooltip provider, themed gradient background,
  version footer fed by `package.json` + `BUILD_TIME`.

---

## 3. The synthesis proxy (`/api/tts`)

`src/app/api/tts/route.ts` is a thin proxy to the free "Microsoft Edge Read
Aloud" speech pipeline. `POST` validates the body (`parseParams`), then
`handleTTS` runs:

1. **`refreshEndpoint()`** — obtain/refresh a speech token, cached in
   module-scope `endpoint` / `expiredAt`.
2. **`generateSsml()`** — build the SSML document (§4).
3. **`POST cognitiveservices/v1`** — send SSML to
   `https://{endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1` with
   `X-Microsoft-OutputFormat`, spoofed `okhttp/4.5.0` UA + Azure `Origin`/
   `Referer`, and `Authorization: <token>`.
4. Return the response `arrayBuffer` as an `audio/mpeg` `NextResponse`; when
   `preview === false`, add `Content-Disposition: attachment`.

### 3.1 Token acquisition (the reverse-engineered part)

`getEndpoint()` POSTs to
`https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0` with an
**`X-MT-Signature`** header. `generateSignature()` builds
`MSTranslatorAndroidApp{encodedUrl}{date}{uuid}` (lowercased) and HMAC-SHA-256
signs it with a **hardcoded base64 key**, formatted as
`MSTranslatorAndroidApp::{sig}::{date}::{uuid}`. This is the free "Edge TTS"
trick — no Azure subscription key. Crypto uses `@cdlab/uncrypto` (`randomUUID`,
`subtle`) so it runs on the Edge runtime.

### 3.2 Token cache & de-dup

`expiredAt` / `endpoint` / `clientId` are **module-scoped** — cached per warm
isolate only, not shared across edge isolates (acceptable: the token is cheap and
re-derivable). Expiry is read from the token JWT's `exp` claim (fallback: now +
1h), with a 60s safety margin. `refreshEndpoint` de-dupes concurrent refreshes in
one isolate via a shared `refreshInFlight` promise, so a burst triggers a single
endpoint fetch.

### 3.3 Parameters & defaults

`parseParams`: `voice` defaults to `zh-CN-XiaoxiaoMultilingualNeural` and is
regex-validated against `VOICE_NAME_RE` (`/^[a-zA-Z0-9\-_]+$/`); `rate`/`pitch`
default `0`; `format` defaults to `audio-24khz-48kbitrate-mono-mp3`; `download`
is true when `preview` is `false`. Missing text or an invalid voice → `400`.

---

## 4. SSML assembly & injection defense

`generateSsml(text, voice, rate, pitch)` wraps the text in
`<speak>` → `<voice>` → `<mstts:express-as style="general">` →
`<prosody rate="{rate}%" pitch="{pitch}%" volume="50">`.

**Defense is server-side.** Because `/api/tts` is open, the route escapes user
text with `escapeXml` (`src/lib/utils.ts`) **before** SSML assembly — a caller
cannot inject `</prosody>…` or arbitrary tags. `voice` is regex-validated
(§3.3), so it can't break out of the `name="…"` attribute.

**`<break>` is preserved.** `escapeXml` first extracts legitimate
`<break time="…s"/>` pause tags into placeholders, escapes everything else
(`& < > " '`), then restores the breaks — so the pause tags the UI inserts
survive but injected markup does not. The client also calls `escapeXml` for
custom **edge**-format providers (`tts-form.tsx`), so for those the text is
escaped client-side too; the built-in `edge-api` sends raw text and relies on the
server escape. Either way the server always escapes — that is the invariant.

---

## 5. Text segmentation

`splitText(text, maxLength)` (`src/lib/utils.ts`) is a **width-aware,
punctuation-preferring** splitter:

- **Width model:** each char with `charCodeAt > 127` counts as **2 units**, ASCII
  as 1 — so CJK text is measured by visual width, not code-point count.
- **Break search:** when the running width exceeds `maxLength`, it back-scans up
  to **300 units** for the best break, trying **6 priority tiers** in order:
  newlines → sentence-enders → semicolons → commas/colons → dashes/ellipses →
  whitespace. The first tier that hits wins; if none, it hard-splits at the
  width boundary.
- **`enableSegmentation = false`** (custom providers) skips splitting entirely and
  **truncates** to `splitLength` instead.

The form (`tts-form.tsx`) computes `splitLength` per provider (built-in override,
custom OpenAI `maxLength ?? 4096`, else `5000`), splits, then fires one
`/api/tts` (or provider) request per segment and merges the resulting blobs into
one `audio/mpeg` `Blob`. **Preview** synthesizes only `text.slice(0, 20)`, plays
it, and writes no history.

---

## 6. Providers & the API manager

Two formats exist: **`edge`** (this app's `{text, voice, rate, pitch, preview}`
shape) and **`openai`** (`/v1/audio/speech` shape).

### 6.1 Built-ins

`src/lib/builtin-apis.ts` defines `BUILTIN_APIS`:

| Id | Format | Endpoint | maxLength | splitLength |
| --- | --- | --- | --- | --- |
| `edge-api` | `edge` | `/api/tts` | 50,000 | 5,000 |
| `oai-tts` | `openai` | `https://oai-tts.zwei.de.eu.org/v1/audio/speech` (9 voices) | 4,096 | 4,096 |

`isBuiltinId(id)` is the type guard. Edge voices are loaded from the static
`/speakers.json` asset (~290 locale-grouped voices) via TanStack Query.

### 6.2 Custom providers & overrides (`useApiStore`)

`src/store/useApiStore.ts` (Zustand + `persist`, key `bytts-custom-apis`) holds:

- **`customApis: Record<id, CustomApi>`** — `{id, name, endpoint, apiKey,
  authHeaderName?, modelEndpoint, format, manual: string[], maxLength?,
  enableSegmentation}`; ids are `custom-${Date.now()}`. `manual` is the voice
  list; `modelEndpoint` is an optional model-list URL the API manager can fetch.
- **`builtinOverrides: Record<builtinId, BuiltinOverride>`** — partial
  `{endpoint?, apiKey?, authHeaderName?, maxLength?, splitLength?}`. The effective
  built-in is `{...BUILTIN_APIS[id], ...override}` — non-destructive, restorable.

In the picker a custom provider sits alongside the built-ins. The API manager
(`src/components/api-manager.tsx`) provides add/edit (TanStack Form + Zod), list
with per-item copy / edit / single + batch delete, JSON export/import
(react-dropzone), and the built-in override/restore dialog.

### 6.3 Request-shape rules (`tts-form.tsx`)

- **edge-api (built-in):** POST `{text, voice, rate, pitch, preview}` to
  `/api/tts`; raw text (server escapes). Auth header injected only if the override
  supplies both key + header name.
- **oai-tts (built-in):** POST `{model: 'tts-1', input: cleanText,
  voice: <speaker>, response_format: <ui format>}`; `<break>` tags stripped.
- **custom `openai`:** POST `{model: <speaker>, input: cleanText, voice: 'alloy',
  response_format}` — the **selected voice becomes the model**, voice is
  hardcoded `alloy`; `<break>` stripped.
- **custom `edge`:** POST `{text: escapeXml(text), voice, rate, pitch, preview}`.

**Auth header:** the configured header name carries the key **verbatim** on the
TTS request. Only the API manager's model-list fetch auto-prefixes `Bearer ` when
the header is `Authorization`.

---

## 7. Client storage & history

`src/store/useHistoryStore.ts` (Zustand + `persist`, key `bytts-results`) is a
**split-storage** design so large audio never bloats localStorage:

- **`HistoryItem`** = `{id, name?, timestamp, speaker, text, audioBlob?,
  requestInfo, status, error?}`. `status` is `StatusEnum` (PROCESSING /
  COMPLETED / FAILED, from `@cdlab/ui`).
- **Metadata → localStorage.** `partialize` **strips `audioBlob`** and **drops
  `PROCESSING` items** — an in-flight generation lost to a refresh vanishes rather
  than persisting a hung entry.
- **Blobs → IndexedDB.** `updateHistory` writes the blob's `ArrayBuffer` to
  `dbStore.set(id, buf)` (`src/lib/storage.ts` = `createIDBStore(
  'tts-history-data')` from `@cdlab/utils`).
- **Rehydration.** `onRehydrateStorage` → `rehydrateBlobs` reloads each
  `COMPLETED` item's buffer from IndexedDB and rebuilds the `Blob`; a missing
  buffer flips the item to `FAILED` / `"Audio data lost"`. `isHydrated` guards the
  async restore.

`HistorySection` object-URLs each blob into a waveform player, supports per-item
download and download-all-as-ZIP (`@cdlab/utils` `downloadFile` /
`downloadFilesAsZip`). Request/history ids come from `src/lib/genid.ts`
(`GenidOptimized({workerId: 1})`, `@cdlab/driftflake`).

---

## 8. Access gate

`src/components/PasswordGate.tsx` is a **client-side render gate**:

- On mount it reads `GET /api/config` → `{hasEnvPassword, persistPassword}`. No
  env password → render children directly.
- Unlock is tracked in `sessionStorage` (always) and `localStorage` (key
  `tts-unlocked`, only when `persistPassword`). `POST /api/config {password}`
  validates by plain string compare against `ACCESS_PASSWORD`; a wrong password
  triggers a shake animation.

**Security note:** this gates the UI only. `/api/tts` performs **no** auth check —
a direct POST bypasses the gate entirely. Treat `ACCESS_PASSWORD` as a soft "keep
casual visitors out of the UI" control, never as protection for the synthesis
backend (§1 Non-goals).

---

## 9. Configuration & deployment

### 9.1 Config

All config is `process.env`, read directly in the Edge routes / layout — no
config layer, no bindings. Full table in the [README](README.md#environment-variables):
`ACCESS_PASSWORD`, `PERSIST_PASSWORD`, `MICROSOFT_CLIENTTRACEID` (all optional),
and `BUILD_TIME` (injected in `next.config.ts`, shown in the version footer).
`next.config.ts` also sets `allowedDevOrigins`, `output: 'standalone'`, and
unoptimized images with a `wcd.pages.dev` remote pattern.

### 9.2 Build

`build` is `next build --webpack` — the **webpack builder is forced** (Turbopack
is not used, and is incompatible with the edge output at this Next version).
`build:cf` runs `next-on-pages` → `.vercel/output/static/_worker.js`. There is
**no test script**.

### 9.3 Deploy

Target is **Cloudflare Pages** via `@cloudflare/next-on-pages` — the two Edge
routes ship as Pages Functions (`v8-worker`). There is **no `wrangler.jsonc`**;
this is a Pages build, not a raw Worker, and it uses no Cloudflare bindings
(KV/D1/R2). Live preview: <https://bytts.pages.dev/>. The `output: 'standalone'`
setting exists as a Node self-host fallback.
