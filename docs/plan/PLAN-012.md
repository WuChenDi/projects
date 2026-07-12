# PLAN-012 bycut — audio project type; retire the bytts editor back to TTS-only

- **status**: approved
- **createdAt**: 2026-07-12
- **approvedAt**: 2026-07-12
- **tasks**: FEAT-030, FEAT-031, FEAT-032, FEAT-033

## Goal

Move audio timeline editing out of **bytts** and back into **bycut**, its
original home. bytts returns to being a pure text-to-speech tool (generation
form + history + download only). bycut gains a first-class **audio project
type** so that "new project" asks whether you want a **video** or an **audio**
project, and audio projects run the existing timeline/command/playback/mixdown
machinery without a canvas, exporting to mp3/wav instead of mp4/webm.

## Context (investigation summary)

- **PLAN-011 was the reverse of this.** In 2026-07 the bycut-derived timeline
  editor (audio subset) was ported *into* bytts as an in-page "generate + edit"
  tool (`apps/bytts/src/editor/**`, ~7k lines, FEAT-026..029). A standalone app
  was rejected then only because a separate origin could not read bytts'
  IndexedDB TTS blobs. That constraint dissolves here: bytts keeps its history
  **download**, and the user manually imports the file into bycut — no
  cross-app handoff is built, so the two apps stay fully decoupled.
- **bytts editor is a deliberately-decoupled subtree.** `src/editor/` is
  client-only, lazy-loaded, and touches the TTS side through exactly one
  zustand handoff (`material-bridge.ts` ← `history-section.tsx`
  "send to timeline"). It owns its own types, its own `bytts-editor-*`
  IndexedDB stores, and shares only generic helpers (`@cdlab/utils`,
  `@cdlab/ui`, `@/lib/genid`). Removing it is a clean excision; TTS code is
  untouched except `page.tsx` layout and one history-card button.
- **bycut already has the audio machinery.** `MediaType`/`TrackType`/
  `ElementType` all include `audio`; `AudioManager` is an independent WebAudio
  engine (drives audio even for muted-video projects); trim/split/move/gain
  commands exist; `createTimelineAudioBuffer`/`collectAudioMixSources`
  (`src/lib/media/audio.ts`) already do an offline mixdown; wavesurfer renders
  clip peaks. bytts did **not** invent new editing logic worth porting back —
  it was a subset of what bycut still has.
- **What bycut lacks — three gaps:**
  1. **No project-level type.** `TProject`/`TProjectMetadata`/`TProjectSettings`
     (`src/types/project.ts`) have no `type`. `createNewProject`
     (`src/core/managers/project-manager.ts:74`) hardcodes video settings
     (`DEFAULT_FPS`, `DEFAULT_CANVAS_SIZE`, background). `CreateProjectDialog`
     collects only a name.
  2. **`ensureMainTrack` forces a video main track**
     (`src/lib/timeline/track-utils.ts:186` → `type: 'video'`).
  3. **Export is video-only.** `SceneExporter`
     (`src/services/renderer/scene-exporter.ts`) unconditionally
     `addVideoTrack` + renders canvas per frame; only `Mp4OutputFormat`/
     `WebMOutputFormat`. Audio tracks never drive a pure-audio output.
- **The one piece worth porting back from bytts:** the audio encoder
  `apps/bytts/src/editor/lib/export-encode.ts` —
  `encodeAudioBuffer({ audioBuffer, format: 'mp3' | 'wav', onProgress }): Blob`
  (mediabunny `Mp3OutputFormat` + `@mediabunny/mp3-encoder` WASM fallback; a
  zero-dep RIFF `createWavBlob`). bycut already has `createWavBlob` in
  `lib/media/mediabunny.ts`; the mp3 path is new to bycut. Storage already has
  a v0→v3 migration framework (`CURRENT_PROJECT_VERSION = 3`,
  `src/services/storage/migrations/`), so adding a `type` field is a standard
  v3→v4 migration.

## Proposal

### bycut — introduce an `audio` project type

- **Data model** (`src/types/project.ts`): add
  `type: 'video' | 'audio'` to `TProjectMetadata` (default `'video'` for old
  projects). Audio projects still carry `TProjectSettings` but ignore
  `canvasSize`/`fps`/`background` at render time.
- **Migration**: new `V3toV4Migration` stamps `metadata.type = 'video'` on
  every existing project; bump `CURRENT_PROJECT_VERSION` to 4 and register it
  in `migrations/index.ts`. Add a fixture test alongside the existing
  migration `__tests__`.
- **Creation** (`ProjectManager.createNewProject`): accept
  `{ name, type }`. For `audio`, build a scene whose main track is an **audio**
  track (see below) and skip/neutralize canvas-specific settings.
- **`ensureMainTrack`** (`track-utils.ts`): parameterize the main-track type
  (`'video' | 'audio'`), defaulting to `'video'` to keep video projects
  identical. Audio projects create an audio main track and never synthesize a
  video main track.
- **Create dialog** (`src/components/editor/dialogs/create-project-dialog.tsx`):
  add a video/audio choice (two-card or segmented control) above the name
  field. `NewProjectButton` passes the chosen type through.

### bycut — audio-mode editor UI

The editor shell defaults to a video layout (canvas preview, canvas-size
settings, video-oriented panels). For `type === 'audio'`:

- Hide the canvas/preview surface and the properties that only make sense for
  video (canvas size, background, aspect ratio). Give the vertical space to the
  timeline.
- Keep: transport/playback, timeline tracks (audio + optional text/sticker are
  out of scope for audio — restrict the add-track menu to audio), clip
  inspector (gain/fade), waveform peaks, undo/redo.
- Gate every video-only affordance on `project.metadata.type`. No new editor
  engine — this is conditional rendering over the existing panels.

### bycut — audio export path

- Port `export-encode.ts` into bycut (e.g. `src/lib/media/audio-encode.ts`),
  reusing/merging with the existing `createWavBlob`. Add
  `mediabunny` + `@mediabunny/mp3-encoder` (already catalog-managed from
  PLAN-011; add to bycut's `package.json`).
- Formats: **mp3, wav, m4a**. mp3 = `Mp3OutputFormat` + `@mediabunny/mp3-encoder`
  WASM fallback (always available). wav = zero-dep RIFF. **m4a** = AAC in
  `Mp4OutputFormat` (`AudioSampleSource({ codec: 'aac' })`) — mediabunny 1.50.8
  supports the `aac` codec, but there is **no WASM fallback** for AAC encoding
  (the only `@mediabunny/*` encoder package is mp3). AAC therefore relies on the
  browser's WebCodecs `AudioEncoder`: available on Chrome/Edge/Safari desktop,
  **not on Firefox**. The export dialog must runtime-probe
  `canEncodeAudio('aac')` and disable/hide m4a when unavailable — mp3/wav stay
  the always-available baseline.
- `ProjectManager` export (and/or `RendererManager`) branches on
  `metadata.type`: audio projects call `createTimelineAudioBuffer` →
  `encodeAudioBuffer` (mp3/wav/m4a) and download the blob, **bypassing**
  `SceneExporter` / canvas rendering entirely. Video projects are unchanged.
- Export dialog offers mp3/wav (+ m4a when supported) for audio projects
  (mp4/webm hidden).

### bytts — retire the editor, return to TTS-only

- Delete `apps/bytts/src/editor/**` (subtree) and
  `apps/bytts/src/editor/lib/material-bridge.ts`.
- `history-section.tsx`: remove the "send to timeline" action and any
  bridge imports; keep play/download/detail.
- `app/page.tsx`: drop the bottom timeline panel and the resizable split;
  restore the single generation view (`TTSForm` + `HistorySection`).
- Remove now-unused deps from `apps/bytts/package.json`
  (`mediabunny`, `@mediabunny/mp3-encoder` — TTS itself does not use them;
  confirm no other importer before removing).
- Stale user data: existing `bytts-editor-project` / `bytts-editor-media`
  IndexedDB stores are left orphaned after removal — **no cleanup code**
  (decided: not worth a boot-time side effect; the dead stores are harmless
  and inert once the editor is gone).

## Risks

- **bycut regression surface.** `createNewProject`, `ensureMainTrack`, and the
  export path are core and shared by all existing video projects. Mitigation:
  every branch is gated on `type`, defaults preserve video behavior byte-for-
  byte, and the v3→v4 migration stamps `'video'` so no loaded project changes
  shape. Verify existing video projects create/load/export unchanged.
- **Migration correctness.** A bad migration corrupts real user projects.
  Mitigation: additive field only, defaulted, covered by a fixture test in the
  existing migration test suite; runner already idempotent/versioned.
- **mp3 WASM under bycut's bundler.** bycut builds with `next build`
  (`--webpack` per repo notes for some apps — confirm bycut's). Dynamic-import
  the encoder (as bytts did) so it never lands in the main chunk or the edge
  build; ship wav first if mp3 bundling needs iteration.
- **AAC/m4a has no WASM fallback.** Unlike mp3, AAC encoding depends entirely
  on the browser's WebCodecs `AudioEncoder` (absent on Firefox). Mitigation:
  runtime-probe `canEncodeAudio('aac')` and disable m4a when unsupported;
  mp3/wav remain the always-available baseline so export never hard-fails.
- **Audio-mode UI leaks.** Missing a video-only affordance behind the type gate
  shows a canvas/aspect control in an audio project. Mitigation: audit the
  editor shell + settings panels for `canvasSize`/`fps`/`background`/preview
  usage; drive all of them off `metadata.type`.
- **Data loss on bytts side.** Users who built timelines in bytts lose that
  autosaved state. This is intended (feature removed) but must be an explicit,
  approved decision, not a silent drop.

## Scope

- `apps/bycut/src/types/project.ts` — `type` field
- `apps/bycut/src/services/storage/migrations/{v3-to-v4.ts,index.ts,__tests__}`
- `apps/bycut/src/core/managers/project-manager.ts` — create + export branch
- `apps/bycut/src/lib/timeline/track-utils.ts` — `ensureMainTrack` type param
- `apps/bycut/src/lib/scenes.ts` — audio default scene
- `apps/bycut/src/components/editor/dialogs/create-project-dialog.tsx`,
  `apps/bycut/src/app/[locale]/projects/page.tsx` — type selection
- `apps/bycut/src/lib/media/audio-encode.ts` (new, ported) + export dialog +
  editor shell audio-mode gating
- `apps/bycut/package.json` — mediabunny, @mediabunny/mp3-encoder
- `apps/bytts/src/editor/**` (delete), `history-section.tsx`, `app/page.tsx`,
  `package.json`, one-shot IndexedDB cleanup
- i18n: new create-dialog / export strings in both apps' `messages/{en,zh}.json`
  where the touched components are localized (bycut is; bytts editor was not).
- No API/server changes.

## Alternatives

- **Keep the editor in bytts, extract a shared `@cdlab/audio-editor` package**
  (PLAN-011 "sink logic into a shared package" path). Rejected by user intent:
  bytts should be TTS-only; bycut is the editor. A shared package is more code
  and two consumers to keep in sync for zero product benefit here.
- **Cross-app one-click handoff (bytts → bycut via `window.open` +
  cross-origin `postMessage` of the audio ArrayBuffer).** Deferred, not
  rejected: adds popup-timing + origin-allowlist complexity for a convenience.
  Manual download→import is sufficient and keeps the apps decoupled. Can be
  added later without changing this plan's architecture.
- **A separate audio-only route in bycut instead of a project type.** Rejected:
  duplicates the editor shell; the type field reuses one editor with
  conditional chrome.

## Work Items

1. **FEAT-030 bycut audio project type (data + creation)** — `type` field,
   v3→v4 migration (+ test), `createNewProject({ name, type })`,
   `ensureMainTrack` type param, audio default scene, `CreateProjectDialog`
   video/audio choice. -> verify: create an audio project → it opens with an
   audio main track and no video track/canvas defaults; create a video project
   → byte-identical to today; existing projects load post-migration with
   `type: 'video'`; migration test green.
2. **FEAT-031 bycut audio-mode editor UI** — gate canvas preview + canvas/fps/
   background/aspect controls + non-audio add-track options on
   `metadata.type === 'audio'`; timeline takes the freed space. -> verify: an
   audio project shows no canvas or video-only controls, only the timeline +
   transport + audio clip inspector; a video project is visually unchanged.
3. **FEAT-032 bycut audio export** — port `encodeAudioBuffer` (mp3/wav),
   branch export on `metadata.type` to `createTimelineAudioBuffer` →
   encode → download (bypassing `SceneExporter`); export dialog mp3/wav for
   audio. -> verify: an audio project with gain/fades exports an mp3 that
   matches the timeline audibly; wav too; video export unchanged; `pnpm
   --filter @cdlab/bycut build` passes.
4. **FEAT-033 bytts return to TTS-only** — delete `src/editor/**` +
   `material-bridge`, remove "send to timeline", restore single-view
   `page.tsx`, drop unused deps, one-shot `bytts-editor-*` IndexedDB cleanup.
   -> verify: bytts renders generation + history only, generate/play/download
   work, no editor chunk in the bundle, no dangling imports, `pnpm --filter
   @cdlab/bytts build` + `build:cf` pass.

## Resolved Questions

1. **Audio export formats** → mp3 + wav + **m4a**. m4a via `Mp4OutputFormat` +
   `aac` codec, runtime-probed (`canEncodeAudio('aac')`) and disabled where the
   browser can't encode AAC (Firefox). Bare `.aac`/ADTS not shipped.
2. **bytts stale data** → do **not** clean up; leave the orphaned
   `bytts-editor-*` IndexedDB stores in place (no boot-time deletion code).
3. **Execution** → BKD three-tier. This session drives L1 on issue
   `projects/68ll1mkh/issues/f4lmwul1`: record the report, split into tasks,
   then dispatch. bycut FEAT-030→031→032 is a dependency chain; bytts FEAT-033
   is standalone and can run in parallel.

## Annotations

- 2026-07-12: Drafted from a two-app investigation (bytts editor subtree +
  bycut architecture).
- 2026-07-12: User resolved all three open questions (add m4a with AAC
  capability probe; no stale-data cleanup; execute via BKD L1 on issue
  `f4lmwul1`). Plan approved for execution.
