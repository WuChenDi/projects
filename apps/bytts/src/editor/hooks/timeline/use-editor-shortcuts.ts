import type { RefObject } from 'react'
import { useEffect } from 'react'
import { useEditorActions } from '@/editor/hooks/timeline/use-editor-actions'

// Keyboard shortcuts for the editor. Scoped to when the pointer is over the
// editor region (the timeline is embedded below a form with its own inputs, so
// window-global Ctrl+Z would otherwise fight the page). Shortcuts match bycut:
// S = split, Delete/Backspace = delete, Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z = undo/
// redo, Ctrl/Cmd+C / V = copy/paste, Ctrl/Cmd+D = duplicate, Ctrl/Cmd+A =
// select all.

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function useEditorShortcuts({
  activeRef,
}: {
  activeRef: RefObject<boolean>
}) {
  const actions = useEditorActions()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current) return
      if (isEditableTarget(event.target)) return

      const mod = event.metaKey || event.ctrlKey

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) actions.redo()
        else actions.undo()
        return
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        actions.redo()
        return
      }
      if (mod && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        actions.copy()
        return
      }
      if (mod && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        actions.paste()
        return
      }
      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        actions.duplicate()
        return
      }
      if (mod && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        actions.selectAll()
        return
      }
      if (!mod && event.key.toLowerCase() === 's') {
        event.preventDefault()
        actions.split()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        actions.deleteSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [actions, activeRef])
}
