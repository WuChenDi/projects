# FEAT-031 bycut — audio-mode editor UI

- **status**: todo
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-07-12
- **plan**: PLAN-012

## Description

Adapt the editor shell so `type === 'audio'` projects present an audio-only
layout instead of the video (canvas) layout.

- Hide the canvas/preview surface and video-only settings (canvas size,
  background, aspect ratio, fps) for audio projects; give the space to the
  timeline.
- Restrict the add-track menu to audio tracks for audio projects.
- Keep transport/playback, timeline tracks, clip inspector (gain/fade),
  waveform peaks, undo/redo.
- Drive every gate off `project.metadata.type`. No new editor engine — this is
  conditional rendering over existing panels.

## Acceptance Criteria

- An audio project shows only timeline + transport + audio clip inspector; no
  canvas or video-only controls anywhere in the editor.
- A video project is visually and behaviorally unchanged.
- `pnpm --filter @cdlab/bycut build` passes.

## Dependencies

- **blocked by**: FEAT-030
- **blocks**: (none)

## Notes

- Audit editor shell + settings panels for `canvasSize`/`fps`/`background`/
  preview usage; ensure none render in audio mode.
