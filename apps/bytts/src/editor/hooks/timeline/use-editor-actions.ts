import { useCallback } from 'react'
import type { ClipboardClip } from '@/editor/core/timeline-commands'
import { useEditor } from '@/editor/hooks/use-editor'
import { useTimelineUiStore } from '@/editor/lib/timeline-ui-store'
import type { AudioTrack, ClipRef } from '@/editor/types'

// Central editing actions shared by the toolbar buttons and keyboard shortcuts.
// Each routes through EditorCore so it becomes exactly one undo step. Mirrors
// bycut's action handlers, trimmed to the audio interaction set.

function getClipsAtTime({
  tracks,
  time,
}: {
  tracks: AudioTrack[]
  time: number
}): ClipRef[] {
  const clips: ClipRef[] = []
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (time > clip.startTime && time < clip.startTime + clip.duration) {
        clips.push({ trackId: track.id, clipId: clip.id })
      }
    }
  }
  return clips
}

export function useEditorActions() {
  const editor = useEditor()
  const clipboard = useTimelineUiStore((state) => state.clipboard)
  const setClipboard = useTimelineUiStore((state) => state.setClipboard)

  const split = useCallback(() => {
    const time = editor.playback.getCurrentTime()
    const selected = editor.selection.getSelected()
    const clips =
      selected.length > 0
        ? selected
        : getClipsAtTime({ tracks: editor.timeline.getTracks(), time })
    if (clips.length === 0) return
    editor.timeline.splitClips({ clips, splitTime: time })
  }, [editor])

  const duplicate = useCallback(() => {
    const selected = editor.selection.getSelected()
    if (selected.length === 0) return
    editor.timeline.duplicateClips({ clips: selected })
  }, [editor])

  const deleteSelected = useCallback(() => {
    const selected = editor.selection.getSelected()
    if (selected.length === 0) return
    editor.timeline.deleteClips({ clips: selected })
  }, [editor])

  const copy = useCallback(() => {
    const selected = editor.selection.getSelected()
    if (selected.length === 0) return
    const items: ClipboardClip[] = []
    for (const track of editor.timeline.getTracks()) {
      for (const clip of track.clips) {
        const isSelected = selected.some(
          (ref) => ref.trackId === track.id && ref.clipId === clip.id,
        )
        if (!isSelected) continue
        const { id: _id, ...clipWithoutId } = clip
        items.push({ trackId: track.id, clip: clipWithoutId })
      }
    }
    setClipboard(items)
  }, [editor, setClipboard])

  const paste = useCallback(() => {
    if (clipboard.length === 0) return
    editor.timeline.pasteClips({
      time: editor.playback.getCurrentTime(),
      items: clipboard,
    })
  }, [editor, clipboard])

  const selectAll = useCallback(() => {
    const clips: ClipRef[] = editor.timeline
      .getTracks()
      .flatMap((track) =>
        track.clips.map((clip) => ({ trackId: track.id, clipId: clip.id })),
      )
    editor.selection.setSelected({ clips })
  }, [editor])

  const undo = useCallback(() => editor.command.undo(), [editor])
  const redo = useCallback(() => editor.command.redo(), [editor])

  return {
    split,
    duplicate,
    deleteSelected,
    copy,
    paste,
    selectAll,
    undo,
    redo,
  }
}
