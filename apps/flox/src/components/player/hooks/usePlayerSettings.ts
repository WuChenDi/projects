'use client'

import { useShallow } from 'zustand/react/shallow'
import { useSettingsStore } from '@/lib/store/settings-store'

/**
 * Reactive accessor for player-related settings + their setters.
 */
export function usePlayerSettings() {
  return useSettingsStore(
    useShallow((s) => ({
      autoNextEpisode: s.autoNextEpisode,
      autoSkipIntro: s.autoSkipIntro,
      skipIntroSeconds: s.skipIntroSeconds,
      autoSkipOutro: s.autoSkipOutro,
      skipOutroSeconds: s.skipOutroSeconds,
      seekStepSeconds: s.seekStepSeconds,
      playbackRate: s.playbackRate,
      volume: s.volume,
      muted: s.muted,
      showModeIndicator: s.showModeIndicator,
      adFilter: s.adFilter,
      adFilterMode: s.adFilterMode,
      adKeywords: s.adKeywords,
      fullscreenType: s.fullscreenType,
      proxyMode: s.proxyMode,
      setAutoNextEpisode: s.setAutoNextEpisode,
      setAutoSkipIntro: s.setAutoSkipIntro,
      setSkipIntroSeconds: s.setSkipIntroSeconds,
      setAutoSkipOutro: s.setAutoSkipOutro,
      setSkipOutroSeconds: s.setSkipOutroSeconds,
      setSeekStepSeconds: s.setSeekStepSeconds,
      setPlaybackRate: s.setPlaybackRate,
      setVolume: s.setVolume,
      setMuted: s.setMuted,
      setShowModeIndicator: s.setShowModeIndicator,
      setAdFilter: s.setAdFilter,
      setAdFilterMode: s.setAdFilterMode,
      setAdKeywords: s.setAdKeywords,
      setFullscreenType: s.setFullscreenType,
      setProxyMode: s.setProxyMode,
    })),
  )
}
