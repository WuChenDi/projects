# FEAT-032 bycut — audio export path (mp3/wav)

- **status**: todo
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-07-12
- **plan**: PLAN-012

## Description

Give audio projects a pure-audio export that bypasses canvas rendering.

- Port `apps/bytts/src/editor/lib/export-encode.ts` into bycut
  (`src/lib/media/audio-encode.ts`): `encodeAudioBuffer({ audioBuffer, format:
  'mp3' | 'wav' | 'm4a', onProgress }): Blob`.
  - mp3 → `Mp3OutputFormat` + `@mediabunny/mp3-encoder` WASM fallback (always
    available).
  - wav → zero-dep RIFF (reuse/merge existing `createWavBlob`).
  - m4a → `Mp4OutputFormat` + `AudioSampleSource({ codec: 'aac' })`. **No WASM
    fallback** — depends on WebCodecs `AudioEncoder`. Runtime-probe
    `canEncodeAudio('aac')`; the export dialog disables/hides m4a when the
    browser can't encode AAC (Firefox).
- `ProjectManager` (and/or `RendererManager`) export branches on
  `metadata.type`: audio → `createTimelineAudioBuffer` (honoring gain/fades/
  mute/solo) → `encodeAudioBuffer` → download, **not** `SceneExporter`.
- Export dialog offers mp3/wav (+ m4a when supported) for audio projects
  (mp4/webm hidden).
- Add `mediabunny` + `@mediabunny/mp3-encoder` to `apps/bycut/package.json`
  (catalog-managed already). Dynamic-import the encoder so it stays out of the
  main/edge chunk.

## Acceptance Criteria

- An audio project with per-clip gain/fades exports an mp3 that matches the
  timeline audibly; wav also correct; m4a correct where AAC encoding is
  supported and cleanly hidden/disabled where it isn't (no hard failure).
- Video export (mp4/webm via `SceneExporter`) is unchanged.
- `pnpm --filter @cdlab/bycut build` passes (encoder WASM bundles or falls back
  cleanly).

## Dependencies

- **blocked by**: FEAT-030
- **blocks**: (none)

## Notes

- Mirror bytts' dynamic-import strategy for the mp3 WASM to avoid edge-build
  breakage.
