'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/settings-store'

interface VConsoleInstance {
  destroy: () => void
}

let vConsoleInstance: VConsoleInstance | null = null

export function VConsoleManager() {
  const vConsole = useSettingsStore((s) => s.vConsole)

  useEffect(() => {
    if (vConsole) {
      if (vConsoleInstance) return
      let cancelled = false
      import('vconsole')
        .then(({ default: VConsole }) => {
          if (cancelled) return
          vConsoleInstance = new VConsole()
        })
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }

    vConsoleInstance?.destroy()
    vConsoleInstance = null
  }, [vConsole])

  return null
}
