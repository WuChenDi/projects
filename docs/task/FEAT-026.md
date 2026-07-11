# FEAT-026 bytts — single-page editor shell + timeline render + preview playback

- **status**: pending
- **priority**: P1
- **owner**: (unassigned)
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
