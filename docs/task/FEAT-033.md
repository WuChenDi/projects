# FEAT-033 bytts — return to TTS-only (remove editor)

- **status**: todo
- **priority**: P1
- **owner**: cd
- **createdAt**: 2026-07-12
- **plan**: PLAN-012

## Description

Remove the audio timeline editor from bytts; bytts becomes a pure TTS tool
(generation + history + download).

- Delete `apps/bytts/src/editor/**` (including `lib/material-bridge.ts`).
- `src/components/history-section.tsx` — remove the "send to timeline" action
  and bridge imports; keep play/download/detail.
- `src/app/page.tsx` — drop the bottom timeline panel and resizable split;
  restore the single generation view (`TTSForm` + `HistorySection`).
- `package.json` — remove now-unused deps (`mediabunny`,
  `@mediabunny/mp3-encoder`) after confirming no other importer.
- Do **not** add IndexedDB cleanup — the orphaned `bytts-editor-*` stores are
  left in place (resolved).

## Acceptance Criteria

- bytts renders generation + history only; generate/play/download work.
- No editor chunk in the bundle; no dangling imports or unused deps.
- `pnpm --filter @cdlab/bytts build` + `build:cf` pass.

## Dependencies

- **blocked by**: (none — independent of the bycut work)
- **blocks**: (none)

## Notes

- Independent of FEAT-030..032; can run in a parallel worktree.
