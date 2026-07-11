import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { EditorCore } from '@/editor/core'

// Subscribes a component to every manager and re-renders on any notify().
// Ported from bycut's use-editor, trimmed to the audio manager set.

export function useEditor(): EditorCore {
  const editor = useMemo(() => EditorCore.getInstance(), [])
  const versionRef = useRef(0)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleStoreChange = () => {
        versionRef.current += 1
        onStoreChange()
      }

      const unsubscribers = [
        editor.playback.subscribe(handleStoreChange),
        editor.timeline.subscribe(handleStoreChange),
        editor.media.subscribe(handleStoreChange),
        editor.selection.subscribe(handleStoreChange),
      ]

      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe()
      }
    },
    [editor],
  )

  const getSnapshot = useCallback(() => versionRef.current, [])

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return editor
}
