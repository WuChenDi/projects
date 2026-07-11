# FEAT-026 bytts — single-page editor shell + timeline render + preview playback

- **status**: done
- **priority**: P1
- **owner**: L3-6l49clds
- **createdAt**: 2026-07-11

## Description

Restructure bytts `/` into generate-on-top + timeline-editor-below (no new
routes, editor chunk lazy-loaded). Port the audio-only editor core from bycut
(`EditorCore` with timeline/playback/audio/media/selection/commands managers)
and the timeline render layer (ruler, playhead, tracks, audio clip elements
with `@cdlab/ui` canvas waveforms, zoom slider + wheel, click/drag seek).
Material flow: "send to timeline" on history cards (reuses the
`HistoryItem.audioBlob`), plus local audio file drop/browse (mp3/wav/m4a/ogg)
into an IndexedDB-backed media pool. Sample-accurate Web Audio preview
playback (play/pause/seek across multi-track clips).

Acceptance: two TTS results + one local mp3 placed on 2 tracks render correct
waveforms; playback mixes both tracks in sync; scrubbing follows the playhead;
generation form and history remain fully functional on the same page.

## ActiveForm

Building bytts editor shell, timeline render, and preview playback

## Dependencies

- **blocked by**: (none)
- **blocks**: FEAT-027, FEAT-028, FEAT-029

## Notes

Plan: PLAN-011. Donor code: bycut `src/components/editor/panels/timeline/`,
`src/core/managers/{timeline,playback,audio,media,selection,commands}`.

Shipped: self-contained audio-only editor under `apps/bytts/src/editor/**`
(EditorCore wiring command/timeline/media/selection/playback/audio managers;
scenes/renderer/project/save dropped). Timeline render layer (ruler, ticks,
playhead, tracks, audio clips with `@cdlab/ui` canvas waveforms), zoom
(slider + ctrl/⌘-wheel), click/drag ruler + track seek, multi-track layout.
Material flow: history "发送到时间线" action (reuses `HistoryItem.audioBlob`
keyed by history id via a buffered zustand bridge) + local audio drop/browse
(mp3/wav/m4a/ogg) decoded through `AudioContext.decodeAudioData` into a
`createIDBStore`-backed media pool. Sample-accurate Web Audio preview
(play/pause/seek mixing multiple tracks/clips), ported from bycut's
audio-manager. Editor is lazy-loaded via `next/dynamic` (ssr:false) from
`app/page.tsx`; TTSForm + HistorySection remain unchanged on the same page.
Out of 026 (stubbed for later tasks): drag-move/trim/split/select/snap/
undo-redo/autosave (027), fades/gain/mute-solo/silence (028), export (029).
