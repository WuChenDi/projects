# vidl — Design

> A pure-browser video downloader. There is no server: the page fetches an
> M3U8/HLS manifest (or a direct video URL), decrypts AES-128 segments, transmuxes
> TS→MP4, and writes the result to disk — all client-side. A framework-agnostic
> `DownloadEngine` class holds the non-serializable machinery (buffers, stream
> writer, abort controller) and pushes only serializable UI state into a Zustand
> store; a concurrent worker pool downloads segments, and stream mode pipes each
> finished segment straight to disk so a multi-GB file never buffers in memory.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — reference them as `design §N`.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The download engine](#3-the-download-engine)
4. [Parsing](#4-parsing)
5. [The segment worker pool & retries](#5-the-segment-worker-pool--retries)
6. [Decryption & muxing](#6-decryption--muxing)
7. [Completion: in-memory vs. stream](#7-completion-in-memory-vs-stream)
8. [Batch mode](#8-batch-mode)
9. [State & storage](#9-state--storage)
10. [Configuration & deployment](#10-configuration--deployment)

---

## 1. Background & goals

Downloading an HLS stream in a browser is deceptively involved: a playlist is
tens to thousands of separate `.ts` segments, often AES-128 encrypted, that must
be fetched concurrently (but not unboundedly), decrypted, optionally transmuxed
into a single MP4, and delivered as one file — without exhausting tab memory and
without a server that sees your URLs. Most tools solve this with a backend proxy.

`vidl` takes the opposite path — a static site that does everything locally —
and holds itself to these goals:

- **G1 — Zero server.** No upload, no API, no logging. The URL, the key, and the
  bytes never leave the tab. The app is a static export (`output: 'export'`).
- **G2 — Bounded memory.** A large download must not require holding the whole
  file in RAM; stream mode writes to disk as segments complete.
- **G3 — Encrypted HLS first-class.** `#EXT-X-KEY` is auto-handled — key fetch,
  AES-128-CBC decrypt, IV-from-index fallback — with no plugin.
- **G4 — Resilient by default.** Flaky segment hosts are the norm; per-segment
  retry, exponential backoff, and a stall watchdog must recover without user
  action, and the user can pause / resume / retry / force-download partials.
- **G5 — Framework-agnostic core.** The engine is a plain class driven
  imperatively, so the download logic is independent of React and testable in
  isolation.

### Non-goals

- **Not a proxy / CORS bypass.** Fetches are browser requests to third-party
  hosts; only CORS-permissive origins work. There is no server to relay bytes.
- **Not a player** — previewing is delegated to byplay via a deep link.
- **No DRM / EME.** Only standard HLS AES-128; not Widevine / FairPlay.
- **No persistence of downloads** — only the settings knobs are persisted
  (localStorage); everything else is in-memory and vanishes on reload.

---

## 2. Architecture

```
                         browser tab (no server)
  user ── paste URL ──►┌─────────────────────────────────────────────┐
                       │ src/app/[locale]/page.tsx  (single | batch)  │
                       │   useDownloadActions / useBatchActions       │
                       │        │                                     │
                       │   DownloadEngine (class, per hook via useRef)│
                       │    ├─ class fields: buffers, streamWriter,   │
                       │    │   abortController, timers  (non-store)  │
                       │    └─ StoreApi → Zustand download-store      │
                       └──────┬───────────────┬──────────────┬───────┘
                              │               │              │
                        fetch() segments   mux.js         StreamSaver.js
                        (third-party CDNs) (TS→MP4,        (WritableStream →
                         + AESDecryptor     dynamic import) disk, via SW)
```

`vidl` is a **Next.js App Router app statically exported** to Cloudflare Pages —
there is no runtime server, edge function, or binding. `next.config.ts` sets
`output: 'export'`; `middleware.ts` is the `next-intl` locale middleware (a
build/static-export shim, not a runtime hop). `build:cf` (`@cloudflare/next-on-pages`)
is only the Pages build wrapper around the same static output.

**Routing surfaces.** Root `src/app/page.tsx` `redirect('/en')` (only meaningful
in static export). `src/app/[locale]/layout.tsx` is the HTML shell — Geist fonts,
the `next-intl` provider, theme/client providers, and heavy per-locale JSON-LD /
OpenGraph SEO (en + zh via `generateMetadata`). `src/app/[locale]/page.tsx` is
the application (`'use client'`): a two-tab UI (single vs. batch) that loads
`StreamSaver.js` via `next/script` and wires the two action hooks.

**Engine-per-hook.** Each of the two action hooks instantiates its own
`DownloadEngine` via `useRef` (see §8 — they share the same `download-store` but
run independently). The engine is constructed with three collaborators:

- a `StoreApi` adapter (`{ getState, setState }` — the Zustand store itself),
- `getSettings()` — reads the settings store live each call,
- an `EngineNotifier` (`success/error/warning/info`) whose concrete impl maps
  engine message codes to i18n toasts (`use-download-actions.ts`).

The engine keeps **non-serializable state as private class fields**
(`mediaFileList: ArrayBuffer[]`, `streamWriter`, `abortController`,
`downloadingTimestamps`, `beginTime`, `durationSecond`, `isRetrying`,
`isStreamMode`) and pushes only serializable UI state (progress, statuses,
flags) into the store. This split is deliberate: `ArrayBuffer`s and a stream
writer must never enter a React/Zustand snapshot.

---

## 3. The download engine

**Entry:** `src/lib/download-engine.ts`, class `DownloadEngine`. It exposes an
imperative surface driven by the hooks:

| Method | Role |
| --- | --- |
| `parseM3U8(url)` | Detect direct-video vs. manifest; parse master/media (§4). |
| `selectVariant(v)` | Re-fetch a chosen master-playlist variant and parse it. |
| `startDownload(isGetMP4)` | In-memory download of the current segment range (§5–7). |
| `streamDownload(isGetMP4)` | Same, but writes to disk via `StreamSaver.js` (§7). |
| `directDownload()` | Single-request fetch of a direct-video URL → Blob → save. |
| `togglePause()` | Flip `isPaused`; on resume, kick `retryAll(true)`. |
| `retry(index)` | Manually re-fetch one errored segment. |
| `retryAll(forceRestart)` | Watchdog / resume: re-queue stalled/errored segments (§5). |
| `forceDownload()` | Assemble whatever segments exist so far into a partial file. |
| `cancelDownload()` | Abort in-flight fetches, reset progress, drop buffers/writer. |
| `resetState()` | Clear everything (guarded while downloading). |
| `onStreamSaverReady()` | Wire `StreamSaver` middle-transporter; flip stream-supported. |
| `destroy()` | Unmount cleanup: destroy the AES decryptor, abort the writer. |

A download's serializable state lives in `download-store` (§9); the engine reads
it via `store.getState()` on every iteration so pause/abort are observed
cooperatively (there are no long-held closures over stale state).

---

## 4. Parsing

`parseM3U8(targetUrl)` (`download-engine.ts`) resets all parse state, then
branches:

1. **Direct video** — `isDirectVideoUrl` (URL pathname ends in a
   `VIDEO_MIME_MAP` extension). Fires a `HEAD` for `Content-Length` (best-effort)
   and returns; the UI shows a direct-download button.
2. **Manifest guard** — the URL must contain `m3u8` (case-insensitive) or it is
   rejected (`invalidUrl`). Then `fetchData(url)` fetches the manifest text.
3. **Master vs. media** — `isMasterPlaylist` (`m3u8-parser.ts`) checks for
   `#EXT-X-STREAM-INF`. If master, `parseMasterPlaylistContent` extracts
   variants (BANDWIDTH / RESOLUTION / NAME), **sorted by bandwidth descending**,
   and the engine auto-selects the highest (`selectVariant`). A variant can
   itself be a nested master (re-parsed).
4. **Media playlist** — `parseMediaPlaylist`: every non-`#`, non-blank line is a
   segment URL resolved via `applyURL` (relative→absolute against the manifest
   base; **`http:`→`https:` upgrade** when the page is HTTPS, to dodge
   mixed-content blocking). Builds `finishList` (one status cell per segment),
   sets the default range `[1, N]`, and fires an async **sampled** file-size
   estimate — `estimateFileSize` HEADs the first / middle / last segment and
   scales the average by segment count.

> **AES IV note (§6).** An IV parsed from `#EXT-X-KEY` is stored `TextEncoder`-
> encoded raw, **not hex-decoded** — a hex `0x…` IV is an edge case. When no IV
> is present, one is derived per-segment as the 16-byte big-endian segment index
> (standard HLS).

---

## 5. The segment worker pool & retries

`downloadTS(urlList, finishItems, startSegment, endSegment, isGetMP4)` is a
**shared-cursor worker pool**, not chunking:

- A `next()` closure hands out the next segment index and advances
  `downloadState.downloadIndex`; `concurrency` worker coroutines loop calling
  `next()` until it returns `null`.
- `concurrency = min(settings.concurrency, pendingCount || targetSegment)` — you
  never spawn more workers than there are segments left.
- Each worker, per segment: mark `downloading`, record a start timestamp, then
  **per-attempt retry up to `maxRetries`** — `fetchData(url, 'file', signal,
  timeoutMs)` with exponential backoff `retryBaseDelayMs · 2^attempt` between
  attempts. On success → `dealTS` (§6); on exhaustion → mark `error` (and emit a
  `retryWarning` toast every 5th error).
- Every iteration re-reads `downloadState` and bails on `isPaused` / not
  `isDownloading`, so pause and cancel are honored mid-flight. Fetches are tied
  to `abortController.signal`, so `cancelDownload()` aborts them immediately.

There are **two independent retry mechanisms** — do not conflate them:

1. **Per-attempt backoff** (above) — inside a single worker, for one segment.
2. **`retryAll` watchdog** — a 2s interval (`use-download-actions.ts`) calls
   `retryAll(false)`. It scans the active range and re-queues segments that are
   `error`, or `''` but not currently downloading, or `downloading` but stale
   (started > `timeoutMs + 5000` ms ago — the timed-out-but-not-yet-failed case).
   If the pool has drained (`downloadIndex >= endSegment`) or on forced restart,
   it relaunches `downloadTS` from the first pending index. Resume
   (`togglePause`) calls `retryAll(true)`.

`getTargetSegment()` computes the number of segments in the (clamped, ordered)
range — the completion target used throughout.

---

## 6. Decryption & muxing

`dealTS(file, index, startSegment, isGetMP4)` runs per downloaded segment:

1. **AES-128-CBC decrypt** (if `aesConf.uri` is set). `getAES` fetched the key
   URL and built an `AESDecryptor` (`aes-decryptor.ts` — a standalone
   implementation: S-box / inverse tables, `expandKey`, block decrypt, PKCS7
   unpad). `aesDecrypt` uses the playlist IV, or the **per-segment index IV
   fallback** (16-byte big-endian index) when the key line carried no IV.
2. **Transmux** (`conversionMp4`, only when MP4 requested). `mux.js` is
   **dynamically imported per download** (`import('mux.js')`, `@ts-expect-error`
   on the import) to keep it out of the initial bundle. A `mp4.Transmuxer`
   (`keepOriginalTimestamps: true`, total `duration` summed from `#EXTINF`)
   converts TS→MP4; the **first segment** gets its `initSegment` prepended. A 10s
   timeout guards a stuck transmux, and a `done` event without `data` falls back
   to the raw segment.
3. **Store** the result at `mediaFileList[index - startSegment + 1]`, set
   `hasMediaData`, and mark the cell `finish`. In stream mode, immediately flush
   any now-contiguous prefix of `mediaFileList` to the writer (§7).

`durationSecond` (summed `#EXTINF` over the selected range) is computed in
`startDownload` before the pool launches and handed to every transmuxer so
timestamps are coherent across segments.

---

## 7. Completion: in-memory vs. stream

The engine runs one of two delivery paths, selected by whether a `streamWriter`
exists. `checkCompletion()` runs after the worker pool drains.

**In-memory** (`startDownload`, and the Safari stream fallback): segments
accumulate in `mediaFileList`. When `finishNum === targetSegment`, all buffers
are assembled by `triggerBrowserDownload` (a single `Blob`, `.mp4` or `.ts`, via
`@cdlab/utils`' `downloadFile`). Peak memory is the whole file.

**Stream** (`streamDownload`): `StreamSaver.js` `createWriteStream` yields a
`WritableStream` whose writer the engine holds. As segments complete **in order**
(`dealTS` and `checkCompletion` both flush the contiguous prefix from
`streamDownloadIndex`, nulling each buffer as it is written), bytes go straight to
disk; when `streamDownloadIndex >= targetSegment` the writer is closed. Peak
memory is roughly one segment plus any out-of-order gap.

**Stream support & the vendored assets.** Stream mode needs the Service
Worker–backed `StreamSaver.js` machinery in `public/static/`:
`StreamSaver.js` (loaded via `next/script`), `mitm.html` (a hidden iframe
middle-transporter that keep-alive pings), and `serviceWorker.js` (intercepts the
generated URL and streams `application/octet-stream` to trigger the browser
save). `onStreamSaverReady()` sets `streamSaver.middleTransporterUrl` to
`${origin}/static/mitm.html` and flips `isStreamSupported` — **but only when
`!streamSaver.useBlobFallback`**. On Safari/WebKit `StreamSaver` sets
`useBlobFallback`, so stream mode stays unsupported and the UI hides the stream
format options (`source-card.tsx`), routing Safari through the in-memory path.

`forceDownload()` bypasses completion entirely: it assembles whatever segments
are already buffered into a partial file — useful when a few segments are
permanently unreachable.

---

## 8. Batch mode

Batch mode (`use-batch-actions.ts` + `batch-store.ts`) reuses the same engine
class but a **separate instance** with a **no-op notifier** (silent — no toasts
per item). It shares the single `download-store`, so processing is strictly
sequential.

- **Queue** — `BatchItem` = `{ id, url, status, meta, selectedVariantUrl,
  rangeStart, rangeEnd, customName, format }`, status machine
  `pending → parsing → parsed → downloading → done | error`. `BatchFormat` =
  `ts | mp4 | stream-ts | stream-mp4`.
- **Parse** — `fetchUrlMetadata` (`batch-utils.ts`) resolves each URL to
  `{ isDirectVideo, variants, segmentCount, estimatedSize, resolvedUrl }`
  (for master playlists it pre-fetches the best variant and estimates size).
- **Download loop** — for each `parsed` item: set the store URL + filename,
  `resetState()` the shared engine, re-parse, apply the item's custom range,
  then dispatch to `directDownload` / `streamDownload` / `startDownload` by
  format. A `batchAbortRef` short-circuits the loop; there is a 300ms delay
  between items. Because both engines share one store, a single-mode download and
  a batch run cannot proceed at once — the UI disables the inactive tab.

---

## 9. State & storage

There is **no database and no server persistence** — all runtime state is
in-memory Zustand plus browser downloads. The only persisted data is the settings
knobs.

**`download-store`** (`src/stores/download-store.ts`) — single-download UI state
+ actions + derived selectors (`selectFinishNum`, `selectErrorNum`,
`selectTargetSegment`, `selectIsParsed`). Holds `url` (default: a **Mux test
stream**), `tsUrlList`, `variants`, `m3u8Content`, `finishList` (per-segment
status), `rangeDownload`, `downloadState` (`isDownloading`, `isPaused`,
`isGetMP4`, `downloadIndex`, `streamDownloadIndex`), `aesConf`, and the
`isStreamSupported` / `hasMediaData` / `hasStreamWriter` flags. `AesConf`
(`method`, `uri`, `iv`, `key`, `decryptor`) lives here. `resetAll` preserves
`url` and `isStreamSupported`.

**`batch-store`** (§8) — the queue, an `isBatchRunning` / `isBatchParsing` pair,
and derived count selectors. `batchIdCounter` is module-level.

**`settings-store`** (`src/stores/settings-store.ts`) — `DownloadSettings`
**persisted to `localStorage`** key `vidl-download-settings`, partialized to
`{ concurrency, timeoutMs, maxRetries, retryBaseDelayMs }`. Defaults:
concurrency **6**, timeout **30000ms**, retries **3**, base delay **1000ms**.

**Transient "schema"** (types in `video-utils.ts`): `FinishItem`,
`VariantStream`, `RangeDownload`, `DownloadState`; plus `BatchItem` /
`BatchUrlMetadata` (`batch-utils.ts`) and `AesConf` (`download-store.ts`).

> `src/lib/genid.ts` (`GenidOptimized` snowflake via `@cdlab/driftflake`) is
> re-exported from the lib barrel but **unused by the download pipeline** — treat
> it as vestigial when changing the engine.

---

## 10. Configuration & deployment

### 10.1 Config

The only runtime configuration is the settings store (§9), read by the engine
through the injected `getSettings()` — never a global. Constant fallbacks live in
`video-utils.ts` (`FETCH_TIMEOUT_MS = 30000`, `MAX_SEGMENT_RETRIES = 3`,
`RETRY_BASE_DELAY_MS = 1000`). There is **no `.env`, no secret, no binding**.
The single build-time value is `BUILD_TIME` (`next.config.ts`), shown in the
version footer.

### 10.2 Static export

`next.config.ts` sets `output: 'export'` — the build emits static HTML/JS with
no server or edge runtime. Images are `unoptimized`; the only allowed remote
image host is `wcd.pages.dev` (the logo). `next-intl`'s plugin generates
`messages/en.d.json.ts` (gitignored, Biome-excluded).

### 10.3 Deployment

Deploys to **Cloudflare Pages** as static assets (`https://vidl.pages.dev/`).
`pnpm --filter @cdlab/vidl build` produces the export; `build:cf`
(`@cloudflare/next-on-pages`) is the Pages build wrapper around the same output —
there is no `_worker.js` logic, no `wrangler.jsonc`, and no binding to configure.

### 10.4 CORS & mixed content (operational reality)

Because every segment/key/manifest fetch is a browser request to a third-party
host, downloads only succeed for **CORS-permissive** origins — there is no proxy.
And since the app is served over HTTPS, `applyURL` upgrades segment URLs to
`https:`, so http-only segment hosts can fail. These two constraints are the
primary real-world limits and are **by design** (no server = no relay).

### 10.5 Cross-tool link

`SourceCard` offers a one-click jump to the **byplay** player
(`https://byplay.pages.dev/${locale}?url=<encoded>`) to preview the current
stream, preserving the active locale.

### 10.6 Security posture

`dangerouslySetInnerHTML` is used **only** for static JSON-LD in the layout — no
user HTML is ever injected. The document `referrer` is
`no-referrer-when-downgrade`. No cookies, no tracking, no upload.
