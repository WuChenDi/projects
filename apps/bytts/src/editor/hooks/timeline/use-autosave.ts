import { useEffect, useRef, useState } from 'react'
import { EditorCore } from '@/editor/core'
import { restoreProject, saveProject } from '@/editor/lib/autosave'

const SAVE_DEBOUNCE_MS = 500

// Restores the saved timeline on first mount (or seeds two empty tracks when
// there is nothing to restore), then debounce-persists every subsequent change.
// `hydrated` gates the material intake so a restore never races an incoming
// "send to timeline" handoff.

export function useAutosave(): { hydrated: boolean } {
  const [hydrated, setHydrated] = useState(false)
  const hydratedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const core = EditorCore.getInstance()
      // Only restore on a fresh core (page reload); an in-session remount keeps
      // the live tracks untouched.
      if (core.timeline.getTracks().length === 0) {
        const restored = await restoreProject({ editor: core })
        if (cancelled) return
        if (!restored) {
          core.timeline.addTrack()
          core.timeline.addTrack()
        }
      }
      hydratedRef.current = true
      setHydrated(true)
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const core = EditorCore.getInstance()
    let timer: number | null = null

    const schedule = () => {
      if (!hydratedRef.current) return
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = null
        void saveProject({ editor: core })
      }, SAVE_DEBOUNCE_MS)
    }

    const unsubscribers = [
      core.timeline.subscribe(schedule),
      core.media.subscribe(schedule),
    ]

    return () => {
      if (timer !== null) window.clearTimeout(timer)
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  }, [])

  return { hydrated }
}
