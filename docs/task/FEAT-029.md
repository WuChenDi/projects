# FEAT-029 bytts editor — export mixdown (mp3/wav) + save to history

- **status**: pending
- **priority**: P1
- **owner**: (unassigned)
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
