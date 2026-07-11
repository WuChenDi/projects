# FEAT-028 bytts editor — P0 audio features (fades, gain, mute/solo, silence removal)

- **status**: pending
- **priority**: P1
- **owner**: (unassigned)
- **createdAt**: 2026-07-11

## Description

Four audio business features on the timeline:

1. **Fade in/out** — per-clip corner fade handles (0–5 s), curve math ported
   from freecut `shared/utils/audio-fade-curve.ts`; applied via GainNode
   ramps in preview and in the export mixdown.
2. **Per-clip gain** — −60…+12 dB (−60 = mute) in a clip inspector popover +
   draggable volume line on the clip body.
3. **Track mute/solo** — track-header buttons honored by the preview
   scheduler (and later export).
4. **Silence removal** — dialog on a selected clip: `detectSilentRanges`
   ported from freecut `shared/utils/audio-silence.ts` (RMS threshold +
   min-silence duration) running in a Web Worker, range preview overlay on
   the clip, apply = composite command (split + delete + ripple-close gaps).

Acceptance: all four audible/visible in preview; silence detection on a TTS
clip with padded silence finds the gaps and apply closes them; each feature is
a single undo step (silence removal reverts wholly with one Ctrl+Z).

## ActiveForm

Implementing fades, gain, mute/solo, and silence removal

## Dependencies

- **blocked by**: FEAT-026, FEAT-027
- **blocks**: FEAT-029

## Notes

Plan: PLAN-011. Pure-DSP ports only; SoundTouch time-stretch/pitch, EQ, mic
recording, transcript-based editing are explicitly out of scope (P1/P2 tiers,
future plans).
