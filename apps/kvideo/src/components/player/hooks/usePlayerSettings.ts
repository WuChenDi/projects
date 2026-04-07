'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AdFilterMode, PlayerEngine } from '@/lib/store/settings-store'
import { settingsStore } from '@/lib/store/settings-store'

/**
 * Hook to access and update player settings from the settings store
 * Provides reactive updates when settings change
 */
export function usePlayerSettings() {
  const [settings, setSettings] = useState(() => {
    const stored = settingsStore.getSettings()
    return {
      autoNextEpisode: stored.autoNextEpisode,
      autoSkipIntro: stored.autoSkipIntro,
      skipIntroSeconds: stored.skipIntroSeconds,
      autoSkipOutro: stored.autoSkipOutro,
      skipOutroSeconds: stored.skipOutroSeconds,
      showModeIndicator: stored.showModeIndicator,
      adFilter: stored.adFilter,
      adFilterMode: stored.adFilterMode,
      adKeywords: stored.adKeywords,
      fullscreenType: stored.fullscreenType,
      proxyMode: stored.proxyMode,
      playerEngine: stored.playerEngine as PlayerEngine,
    }
  })

  // Subscribe to settings changes
  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      const stored = settingsStore.getSettings()
      setSettings({
        autoNextEpisode: stored.autoNextEpisode,
        autoSkipIntro: stored.autoSkipIntro,
        skipIntroSeconds: stored.skipIntroSeconds,
        autoSkipOutro: stored.autoSkipOutro,
        skipOutroSeconds: stored.skipOutroSeconds,
        showModeIndicator: stored.showModeIndicator,
        adFilter: stored.adFilter,
        adFilterMode: stored.adFilterMode,
        adKeywords: stored.adKeywords,
        fullscreenType: stored.fullscreenType,
        proxyMode: stored.proxyMode,
        playerEngine: stored.playerEngine as PlayerEngine,
      })
    })
    return unsubscribe
  }, [])

  const updateSetting = useCallback(
    <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
      const currentSettings = settingsStore.getSettings()
      settingsStore.saveSettings({
        ...currentSettings,
        [key]: value,
      })
    },
    [],
  )

  const setAutoNextEpisode = useCallback(
    (value: boolean) => {
      updateSetting('autoNextEpisode', value)
    },
    [updateSetting],
  )

  const setAutoSkipIntro = useCallback(
    (value: boolean) => {
      updateSetting('autoSkipIntro', value)
    },
    [updateSetting],
  )

  const setSkipIntroSeconds = useCallback(
    (value: number) => {
      updateSetting('skipIntroSeconds', Math.max(0, value))
    },
    [updateSetting],
  )

  const setAutoSkipOutro = useCallback(
    (value: boolean) => {
      updateSetting('autoSkipOutro', value)
    },
    [updateSetting],
  )

  const setSkipOutroSeconds = useCallback(
    (value: number) => {
      updateSetting('skipOutroSeconds', Math.max(0, value))
    },
    [updateSetting],
  )

  const setShowModeIndicator = useCallback(
    (value: boolean) => {
      updateSetting('showModeIndicator', value)
    },
    [updateSetting],
  )

  const setAdFilter = useCallback(
    (value: boolean) => {
      updateSetting('adFilter', value)
    },
    [updateSetting],
  )

  const setAdFilterMode = useCallback(
    (value: AdFilterMode) => {
      updateSetting('adFilterMode', value)
    },
    [updateSetting],
  )

  const setAdKeywords = useCallback(
    (value: string[]) => {
      updateSetting('adKeywords', value)
    },
    [updateSetting],
  )

  const setFullscreenType = useCallback(
    (value: 'native' | 'window') => {
      updateSetting('fullscreenType', value)
    },
    [updateSetting],
  )

  const setProxyMode = useCallback(
    (value: 'retry' | 'none' | 'always') => {
      updateSetting('proxyMode', value)
    },
    [updateSetting],
  )

  const setPlayerEngine = useCallback(
    (value: PlayerEngine) => {
      updateSetting('playerEngine', value)
    },
    [updateSetting],
  )

  return {
    ...settings,
    setAutoNextEpisode,
    setAutoSkipIntro,
    setSkipIntroSeconds,
    setAutoSkipOutro,
    setSkipOutroSeconds,
    setShowModeIndicator,
    setAdFilter,
    setAdFilterMode,
    setAdKeywords,
    setFullscreenType,
    setProxyMode,
    setPlayerEngine,
  }
}
