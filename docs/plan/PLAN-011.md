# PLAN-011 bytts — single-page audio timeline editor (generate + edit)

- **status**: done
- **createdAt**: 2026-07-11
- **approvedAt**: 2026-07-11 13:15
- **tasks**: FEAT-026, FEAT-027, FEAT-028, FEAT-029

## Goal

Turn bytts into a one-page "generate + edit" audio tool, freecut-style: the
existing TTS generation form and history stay on the page, and a bycut-style
timeline editor (audio-only) sits below. Users drop TTS results or local audio
files onto multi-track timeline, arrange/trim/split clips, apply P0 audio
features (fade in/out, per-clip gain, track mute/solo, silence removal), and
export a mixdown (mp3/wav) back into history. No new routes.

## Context (investigation summary)

- **bytts today**: single page `src/app/page.tsx` — grid `[420px_1fr]`, left
  `TTSForm`, right `HistorySection`. TTS result is an `audio/mpeg` Blob in
  `useHistoryStore` (`HistoryItem.audioBlob`), binary persisted to IndexedDB
  via `src/lib/storage.ts` (`@cdlab/utils` `createIDBStore`). No i18n
  (hardcoded Chinese UI). Deployed via `@cloudflare/next-on-pages`; only
  `/api/tts` is Edge — the editor is 100% client-side, no server impact.
- **bycut (donor)**: timeline UI is compact and portable — components ~3.1k
  lines (`src/components/editor/panels/timeline/`), hooks ~3.2k
  (`src/hooks/timeline/`), lib ~1.6k (`src/lib/timeline/`), commands ~2.4k,
  managers needed: `timeline`(413) / `playback`(172) / `audio`(266) /
  `media`(164) / `selection`(35) / `commands`(44). Video-only parts
  (thumbnail strip, transitions, freeze-frame, scenes/renderer/project
  managers) are dropped. Split/trim arithmetic lives in
  `lib/commands/timeline/element/{split-elements,update-element-trim}.ts`.
  Audio preview is sample-accurate Web Audio scheduling (`audio-manager.ts`).
  WAV encoder `createWavBlob` (`lib/media/mediabunny.ts`) is dependency-free.
- **freecut (recipe donor, code not forked — 74k lines, different stack)**:
  - audio-only encode: mediabunny `Output` + `AudioSampleSource` +
    `Mp3OutputFormat`/`WavOutputFormat`, `@mediabunny/mp3-encoder` WASM
    fallback (`features/export/utils/canvas-render-orchestrator.ts`,
    `shared/media/audio-encoder-support.ts`).
  - pure-DSP business features to port: `shared/utils/audio-fade-curve.ts`
    (273 lines), `shared/utils/audio-silence.ts` (`detectSilentRanges`, 289
    lines) + `workers/silence-detection-worker.ts`, clip gain dB math.
- **Why in-bytts, not a new app**: TTS blobs live in bytts-origin IndexedDB;
  a separate app (different domain) cannot read them — integration would
  degrade to manual download/upload.

## Proposal

### Page layout (single route `/`)

Restructure `page.tsx` into a vertical split, all on `/`:

- **Top**: generation area — `TTSForm` (left) + `HistorySection` (right),
  reusing the existing components with minimal changes. History cards gain a
  "send to timeline" action; the detail dialog stays.
- **Bottom**: editor panel — toolbar (split / trim-to-playhead / copy /
  delete / undo / redo / snap toggle / zoom slider) + ruler + playhead +
  multi audio tracks. Height user-draggable; editor chunk lazy-loaded
  (`next/dynamic`) so the generation UI stays light.

### Editor core (ported from bycut, audio-only)

`apps/bytts/src/editor/` — self-contained subtree:

- `core/`: `EditorCore` with `timeline`, `playback`, `audio`, `media`,
  `selection`, `commands` managers (bycut subset; `scenes`/`renderer`/
  `project`/`save` dropped — persistence is a thin IndexedDB autosave of
  the timeline state instead).
- `components/timeline/`: ruler, playhead, track, element (audio branch
  only), toolbar, snap indicator, drag line. Clip waveform rendered with
  `@cdlab/ui/components/audio-waveform` canvas peaks (no wavesurfer.js dep).
- `hooks/timeline/`, `lib/timeline/`, `lib/commands/`: ported with video
  branches removed. UI copy hardcoded Chinese, matching bytts convention.

Interactions in scope: clip drag (within/cross track), trim handles, split at
playhead, copy, delete, multi-select + box select, snapping, seek by
click/drag on ruler, zoom (slider + wheel), undo/redo, track add/remove.

### Material flow

- History → timeline: "send to timeline" decodes `HistoryItem.audioBlob`
  and appends a clip (media entry keyed by history id, blob reused).
- Local files: drop/browse mp3/wav/m4a/ogg onto the editor; decoded via
  `AudioContext.decodeAudioData`, stored in the editor media pool
  (IndexedDB, same `createIDBStore` pattern).

### P0 audio features

- **Fade in/out**: per-clip fade handles on clip corners; curve math ported
  from freecut `audio-fade-curve.ts`; applied in preview (GainNode ramps)
  and export.
- **Per-clip gain**: −60…+12 dB slider in a clip inspector popover +
  draggable volume line on the clip; −60 mutes.
- **Track mute/solo**: buttons on track headers; honored by preview
  scheduler and export mixdown.
- **Silence removal**: dialog on a selected clip — ported
  `detectSilentRanges` (RMS threshold + min-duration, run in a Web Worker),
  preview overlay of detected ranges, apply = auto split + delete + ripple
  close gaps.

### Export

- Offline mixdown: adapted bycut `createTimelineAudioBuffer` +
  `mixAudioChannels` (applies gain, fades, mute/solo) → stereo AudioBuffer.
- Encode: mediabunny `Output` + `AudioSampleSource` → mp3
  (`Mp3OutputFormat` + `@mediabunny/mp3-encoder`) or wav (`createWavBlob`,
  zero-dep). Result saved as a new `HistoryItem` (name suffix `-edited`) —
  storage layer unchanged — plus direct download.
- New deps (added to pnpm catalog `prod`, latest stable verified at npmjs
  at implementation time): `mediabunny`, `@mediabunny/mp3-encoder`.

## Risks

- **Port size**: ~8k lines adapted from bycut. Mitigation: port
  mechanically first (compile-green), then strip video branches; keep the
  editor subtree isolated under `src/editor/` so bytts' existing code is
  untouched except `page.tsx` + history card action.
- **mp3 encoder WASM under `next build --webpack` + next-on-pages**:
  `@mediabunny/mp3-encoder` bundling needs verification on Pages. Fallback:
  ship WAV export first, mp3 behind a dynamic import; worst case mp3 via
  `AudioEncoder` WebCodecs where available.
- **Memory**: decoded AudioBuffers for long timelines are large. Mitigation:
  decode-on-demand cache keyed by media id (bycut's approach), mono peaks
  cached separately for waveforms.
- **Single-page bundle**: editor is dynamically imported; generation UX
  unaffected if the editor chunk fails to load.
- **Undo/redo across silence removal**: apply as one composite command
  (bycut command bus supports snapshots) so one Ctrl+Z reverts the whole
  operation.

## Scope

- `apps/bytts/src/editor/**` (new, ~8k lines ported+new)
- `apps/bytts/src/app/page.tsx` (layout restructure)
- `apps/bytts/src/components/history-section.tsx` (send-to-timeline action)
- `apps/bytts/package.json`, `pnpm-workspace.yaml` (catalog: mediabunny,
  @mediabunny/mp3-encoder)
- No API/server changes. No changes to bycut/freecut.

## Alternatives

- **Standalone app**: rejected — cannot reach bytts' IndexedDB blobs cross
  origin.
- **wavesurfer.js + Regions for clips**: rejected — `@cdlab/ui`
  `AudioWaveform` already renders peaks from AudioBuffer; wavesurfer adds a
  dep and fights absolute-positioned clip layout.
- **FFmpeg.wasm for export**: rejected — mediabunny covers decode+encode at
  a fraction of the payload; bycut/freecut both prove the stack.
- **Simple region-trim on the existing WaveformPlayer**: rejected by user —
  full timeline interaction (drag/trim/split, multi-track) is required.

## Work Items

1. **FEAT-026 editor shell** — page restructure + core managers + timeline
   render (tracks/clips/waveforms/ruler/playhead/zoom/seek) + material flow
   (history send-to-timeline, local file import) + Web Audio preview
   playback. -> verify: send two TTS results + one local mp3 onto 2 tracks,
   scrub/play in sync, waveforms correct.
2. **FEAT-027 editing interactions** — drag move/cross-track, trim handles,
   split, copy/delete, multi-select, snapping, undo/redo, autosave to
   IndexedDB. -> verify: each interaction + undo/redo round-trip; reload
   restores timeline.
3. **FEAT-028 P0 audio features** — fades, per-clip gain, track mute/solo,
   silence removal dialog. -> verify: audible in preview; silence detection
   on a TTS clip with padded silence finds and removes ranges; single undo
   reverts.
4. **FEAT-029 export** — mixdown honoring gain/fades/mute/solo → mp3/wav,
   save to history + download. -> verify: exported mp3 matches timeline
   audibly; appears in history and survives reload; `pnpm --filter
   @cdlab/bytts build` + `build:cf` pass.

## Annotations

- 2026-07-11: User approved and requested execution via BKD three-tier
  coordination (L1 session issue `hxdmz6lr`, project `68ll1mkh`). Single-page
  requirement confirmed by user: generation + editor on `/`, no new routes.
- 2026-07-11: Completed — FEAT-026..029 all merged; bytts ships the audio
  timeline editor with mp3/wav mixdown export.
