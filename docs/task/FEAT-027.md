# FEAT-027 bytts editor — editing interactions (drag/trim/split/undo) + autosave

- **status**: done
- **priority**: P1
- **owner**: 6m6fpdcq
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

### Shipped (owner 6m6fpdcq)

Command layer — `editor/core/timeline-commands.ts`: snapshot-based commands
(`Split/UpdateTrim/BatchMove/Move/Delete/Duplicate/Paste/AddTrack/RemoveTrack/
ReorderTracks`) on the existing `CommandManager` bus. Each snapshots the full
track array + selection and one Ctrl+Z reverts one logical action. Split/trim/
move arithmetic copied verbatim from bycut (audio simplification: playbackRate
= 1, no still-frame extension). Wrapper methods added to `TimelineManager`
(`splitClips`, `updateClipTrim`, `moveClip`, `moveClipsByDelta`, `deleteClips`,
`duplicateClips`, `pasteClips`, `addTrackWithHistory`, `removeTrack`,
`reorderTracks`). `SelectionManager` gained `toggle`; `MediaManager` gained
`hydrateAsset` (restore without re-decode/re-persist).

Interactions — hooks under `editor/hooks/timeline/`: `use-clip-interaction`
(pending→threshold drag, within + cross-track, batch time-only move),
`use-clip-resize` (left/right trim handles), `use-selection-box` (marquee),
`use-timeline-snapping` (clip edges + playhead, toggleable),
`use-editor-actions` + `use-editor-shortcuts` (S split, Delete/Backspace,
Ctrl/Cmd+Z / Shift+Z / Ctrl+Y, Ctrl/Cmd+C/V/D/A — scoped to pointer-over-editor
so they don't fight the page's TTS form). Toolbar gained split/duplicate/delete/
undo/redo + snap toggle; track-label column gained reorder (▲▼)/mute/remove.
Snap guide + marquee overlay rendered. Snapping/clipboard state in
`editor/lib/timeline-ui-store.ts`.

Autosave — `editor/lib/autosave.ts` + `use-autosave` hook: debounced snapshot
(tracks + media descriptors) to IndexedDB (`bytts-editor-project`); media bytes
already live in `mediaPool` (`bytts-editor-media`). On reload the timeline is
restored exactly and each clip re-links to its pooled blob (clips whose blob is
missing are dropped); when nothing is saved it seeds two empty tracks. Material
intake is gated on hydration so a restore never races a "send to timeline"
handoff. FEAT-026 render/preview/material flow preserved.

Checks: `pnpm --filter @cdlab/bytts typecheck` + `pnpm exec biome check
apps/bytts` + `pnpm --filter @cdlab/bytts build` all pass.
