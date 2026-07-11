# FEAT-027 bytts editor — editing interactions (drag/trim/split/undo) + autosave

- **status**: pending
- **priority**: P1
- **owner**: (unassigned)
- **createdAt**: 2026-07-11

## Description

Port bycut's timeline editing interactions, audio-only: clip drag (within and
across tracks), left/right trim handles, split at playhead (toolbar + S key),
copy/duplicate, delete, multi-select + box select, snapping (clip edges +
playhead, toggleable), track add/remove/reorder, undo/redo via the command
bus. Autosave timeline state (tracks/clips/media refs) to IndexedDB and
restore on reload.

Acceptance: every interaction works with keyboard shortcuts where bycut has
them; each mutation is one undo step and undo/redo round-trips cleanly; page
reload restores the exact timeline (clips re-linked to media pool blobs).

## ActiveForm

Porting timeline editing interactions and autosave

## Dependencies

- **blocked by**: FEAT-026
- **blocks**: FEAT-028, FEAT-029

## Notes

Plan: PLAN-011. Split/trim arithmetic from bycut
`lib/commands/timeline/element/{split-elements,update-element-trim}.ts` —
copy formulas, keep the command-bus wrapper (needed for undo).
