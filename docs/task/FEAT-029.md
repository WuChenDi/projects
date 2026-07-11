# FEAT-029 bytts editor — export mixdown (mp3/wav) + save to history

- **status**: done
- **priority**: P1
- **owner**: f18om1ba
- **createdAt**: 2026-07-11

## Description

Export the timeline to audio: offline mixdown adapted from bycut
`createTimelineAudioBuffer`/`mixAudioChannels`, honoring clip gain, fades,
trims, and track mute/solo → stereo AudioBuffer. Encode to mp3 via mediabunny
(`Output` + `AudioSampleSource` + `Mp3OutputFormat`, `@mediabunny/mp3-encoder`
fallback registration per freecut's `audio-encoder-support.ts` recipe) or wav
via bycut's zero-dep `createWavBlob`. Export dialog with format choice +
progress. Result saved as a new `HistoryItem` (audio/mpeg or audio/wav, name
suffixed `-edited`) and offered as a direct download.

Add `mediabunny` + `@mediabunny/mp3-encoder` to the pnpm `prod` catalog at the
latest stable version verified on npmjs at implementation time.

Acceptance: exported mp3 matches the timeline audibly (gain/fades/mute
applied); appears in history, survives reload (IndexedDB), downloadable;
`pnpm --filter @cdlab/bytts build` and `build:cf` (next-on-pages) pass — the
mp3 encoder WASM must bundle cleanly, otherwise ship wav first and note the
follow-up.

## ActiveForm

Building export mixdown and history write-back

## Dependencies

- **blocked by**: FEAT-026, FEAT-027, FEAT-028
- **blocks**: (none)

## Notes

Plan: PLAN-011. Verify `@mediabunny/mp3-encoder` bundling under
`next build --webpack` + `@cloudflare/next-on-pages` early (spike before UI).

### Completion notes (f18om1ba)

Implemented — mp3 AND wav both ship, no wav-only interim.

- `editor/lib/export-mixdown.ts` — offline mixdown via `OfflineAudioContext`
  (stereo, 44.1 kHz). Reuses `collectAudioClips` (mute/solo/trim resolution),
  `gainDbToLinear` and `getFadeGain` so the export matches the FEAT-028 preview
  exactly: effective gain = `clip.volume * gainDbToLinear(clip.gainDb)`, fade
  envelopes scheduled with `setValueCurveAtTime` (same region/overlap logic as
  audio-manager), trims applied via `node.start(startTime, trimStart, duration)`,
  muted/non-soloed clips dropped. Sources sharing a media id decode once.
- `editor/lib/export-encode.ts` — client-only. mp3 through mediabunny
  `Output` + `Mp3OutputFormat` + `BufferTarget` + `AudioSampleSource`
  (`codec: 'mp3'`, 128 kbps), feeding f32-planar `AudioSample`s in 48k-frame
  chunks; guards `canEncodeAudio('mp3')` and registers `@mediabunny/mp3-encoder`
  on demand. wav via zero-dep `createWavBlob` (ported from bycut). Both
  mediabunny modules are dynamically imported so the encoder chunk never enters
  the editor bundle or the workerd/edge build.
- `editor/components/timeline/export-dialog.tsx` — `ExportButton` in the editor
  top bar: format radio (mp3/wav) + progress bar. On success saves a new
  `HistoryItem` (`-edited` suffix, `StatusEnum.COMPLETED`) via `addHistory` +
  `updateHistory` (the latter persists the blob to IndexedDB), then triggers a
  direct download with `@cdlab/utils` `downloadFile`.
- Catalog: added `@mediabunny/mp3-encoder ^1.50.8` to `prod`; bytts references
  `@mediabunny/mp3-encoder` + `mediabunny` as `catalog:prod`. No next.config
  changes needed.

Checks: typecheck, `biome check apps/bytts`, `build` (webpack) and `build:cf`
(next-on-pages) all pass — the mp3 WASM bundles cleanly, confirming the spike.

Known limitation (out of scope — store not editable here): `useHistoryStore`'s
`rehydrateBlobs` reconstructs every restored blob as `audio/mpeg`, so a reloaded
WAV export carries an mp3 MIME label. The bytes are intact and browsers sniff
WAV in `<audio>`, so playback still works; the direct download at export time
uses the correct `audio/wav` type. A follow-up could store the MIME on the
`HistoryItem`.
