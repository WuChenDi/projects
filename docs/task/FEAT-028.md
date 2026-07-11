# FEAT-028 bytts editor — P0 audio features (fades, gain, mute/solo, silence removal)

- **status**: done
- **priority**: P1
- **owner**: gpjy46mm
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

### Implementation (owner gpjy46mm)

Data model (`editor/types.ts`) — how FEAT-029 export reads the params:

- `AudioClip` gains `fadeIn` / `fadeOut` (seconds, 0..5) and `gainDb` (−60..+12,
  −60 = mute). `volume` (legacy linear, always 1) is kept; effective clip gain =
  `volume * gainDbToLinear(gainDb)`.
- `AudioTrack` gains `solo` (boolean). When any track is soloed, only soloed
  tracks are audible (solo overrides mute on other tracks) — computed in
  `collectAudioClips` (`editor/lib/audio.ts`).
- `AudioClipSource` carries `fadeIn` / `fadeOut` / `gainDb` through to the
  scheduler. Autosave persists all fields; `restoreProject` normalizes older
  snapshots (defaults to 0 / false).

Preview (`editor/core/audio-manager.ts`):

- Base gain applied on the per-clip `GainNode` from `gainDb` × `volume`.
- Fades scheduled via `setValueCurveAtTime` by sampling the ported curve
  (`editor/lib/audio-fade.ts`, from freecut `audio-fade-curve.ts`); two
  independent regions, single-envelope fallback when fades overlap, clamped to
  the context clock for mid-clip starts.
- Mute/solo honored by `collectAudioClips` (scheduler skips muted sources).

Commands (one undo step each, snapshot-based on the existing bus):

- `UpdateClipAudioCommand` — gain / fadeIn / fadeOut / muted.
- `SetTrackFlagsCommand` — track muted / solo.
- `RemoveSilenceCommand` — composite split + delete + ripple in one command:
  merges clip-relative silent ranges, rebuilds the audible complement as packed
  sub-clips (recomputed trims), and pulls later clips on the track left by the
  removed duration — one Ctrl+Z reverts the whole operation.

Silence detection: `detectSilentRanges` ported to `editor/lib/audio-silence.ts`,
run in `editor/workers/silence-detection.worker.ts` (decoded region channel data
transferred zero-copy). UI: `clip-inspector.tsx` popover (gain + fade sliders +
silence entry), `silence-dialog.tsx` (threshold / min-silence / padding + detect
→ overlay preview → apply), corner fade handles + draggable volume line +
fade shading on the clip body (`audio-clip.tsx`), track solo button in the
header.

Checks: `pnpm --filter @cdlab/bytts typecheck`, `pnpm exec biome check
apps/bytts`, `pnpm --filter @cdlab/bytts build` — all pass (worker bundles
cleanly under `next build --webpack`).
