# FEAT-030 bycut — audio project type (data model + creation)

- **status**: todo
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-07-12
- **plan**: PLAN-012

## Description

Introduce a project-level `type: 'video' | 'audio'` in bycut so "new project"
distinguishes audio from video, and audio projects start with an audio main
track and no canvas defaults.

Changes:

- `src/types/project.ts` — add `type: 'video' | 'audio'` to `TProjectMetadata`.
- `src/services/storage/migrations/v3-to-v4.ts` + register in `index.ts`, bump
  `CURRENT_PROJECT_VERSION` to 4; stamp `metadata.type = 'video'` on existing
  projects. Fixture test in `migrations/__tests__`.
- `src/core/managers/project-manager.ts` — `createNewProject({ name, type })`;
  audio path builds an audio-main-track scene and neutralizes canvas settings.
- `src/lib/timeline/track-utils.ts` — parameterize `ensureMainTrack` main-track
  type (default `'video'`).
- `src/lib/scenes.ts` — audio default scene builder.
- `src/components/editor/dialogs/create-project-dialog.tsx` +
  `src/app/[locale]/projects/page.tsx` — video/audio selection; pass through.

## Acceptance Criteria

- Creating an **audio** project opens with an audio main track, no video main
  track, no canvas/fps/background defaults applied.
- Creating a **video** project is byte-identical to current behavior.
- Existing projects load after migration with `metadata.type === 'video'`.
- New migration unit test passes; `pnpm --filter @cdlab/bycut build` passes.

## Dependencies

- **blocked by**: (none)
- **blocks**: FEAT-031, FEAT-032

## Notes

- Defaults must preserve video behavior; every audio branch gated on `type`.
