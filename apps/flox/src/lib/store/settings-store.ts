/**
 * Settings Store - Manages application settings and preferences
 * Uses zustand/vanilla + persist for reactive, consistent state management.
 */

import { DEFAULT_SOURCES } from '@/lib/api/default-sources'
import { PREMIUM_SOURCES } from '@/lib/api/premium-sources'
import type { SourceSubscription, VideoSource } from '@/lib/types'
import { createSubscription } from '@/lib/utils/source-import-utils'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  exportSettings,
  importSettings,
  SEARCH_HISTORY_KEY,
  WATCH_HISTORY_KEY,
} from './settings-helpers'

export type SortOption =
  | 'default'
  | 'relevance'
  | 'latency-asc'
  | 'date-desc'
  | 'date-asc'
  | 'rating-desc'
  | 'name-asc'
  | 'name-desc'

export type SearchDisplayMode = 'normal' | 'grouped'
export type AdFilterMode = 'off' | 'keyword' | 'heuristic' | 'aggressive'
export type ProxyMode = 'retry' | 'none' | 'always'
export type PlayerEngine = 'veplayer' | 'native'

export interface AppSettings {
  sources: VideoSource[]
  premiumSources: VideoSource[]
  subscriptions: SourceSubscription[]
  sortBy: SortOption
  searchHistory: boolean
  watchHistory: boolean
  passwordAccess: boolean
  accessPasswords: string[]
  autoNextEpisode: boolean
  autoSkipIntro: boolean
  skipIntroSeconds: number
  autoSkipOutro: boolean
  skipOutroSeconds: number
  showModeIndicator: boolean
  adFilter: boolean
  adFilterMode: AdFilterMode
  adKeywords: string[]
  realtimeLatency: boolean
  searchDisplayMode: SearchDisplayMode
  episodeReverseOrder: boolean
  fullscreenType: 'native' | 'window'
  proxyMode: ProxyMode
  playerEngine: PlayerEngine
  rememberScrollPosition: boolean
}

const SETTINGS_KEY = 'flox-settings'

export const getDefaultSources = (): VideoSource[] => DEFAULT_SOURCES
export const getDefaultPremiumSources = (): VideoSource[] => PREMIUM_SOURCES

function getEnvSubscriptions(customValue?: string): SourceSubscription[] {
  const envValue = (
    customValue ||
    process.env.SUBSCRIPTION_SOURCES ||
    process.env.NEXT_PUBLIC_SUBSCRIPTION_SOURCES ||
    ''
  ).trim()
  if (!envValue) return []

  try {
    const raw = JSON.parse(envValue)
    if (Array.isArray(raw)) {
      return raw
        .filter(
          (item: any) =>
            item && typeof item.name === 'string' && typeof item.url === 'string',
        )
        .map((item: any) => createSubscription(item.name, item.url))
    }
  } catch {
    // Not JSON, try URL
  }

  if (envValue.includes('http')) {
    const urls = envValue.split(',').map((u) => u.trim()).filter((u) => u.length > 0)
    return urls
      .map((url, index) => {
        if (!url.startsWith('http')) return null
        const name = urls.length > 1 ? `系统预设源 ${index + 1}` : `系统预设源`
        return createSubscription(name, url)
      })
      .filter((s): s is SourceSubscription => s !== null)
  }

  return []
}

function getDefaultAppSettings(): AppSettings {
  return {
    sources: getDefaultSources(),
    premiumSources: getDefaultPremiumSources(),
    subscriptions: getEnvSubscriptions(),
    sortBy: 'default',
    searchHistory: true,
    watchHistory: true,
    passwordAccess: false,
    accessPasswords: [],
    autoNextEpisode: true,
    autoSkipIntro: false,
    skipIntroSeconds: 30,
    autoSkipOutro: false,
    skipOutroSeconds: 60,
    showModeIndicator: false,
    adFilter: false,
    adFilterMode: 'heuristic',
    adKeywords: [],
    realtimeLatency: false,
    searchDisplayMode: 'normal',
    episodeReverseOrder: false,
    fullscreenType: 'native',
    proxyMode: 'retry',
    playerEngine: 'veplayer',
    rememberScrollPosition: true,
  }
}

/**
 * Validates and merges persisted state with defaults.
 * Called by the persist middleware on hydration.
 */
function mergePersistedSettings(persisted: any, defaults: AppSettings): AppSettings {
  if (!persisted || typeof persisted !== 'object') return defaults

  const envSubscriptions = getEnvSubscriptions()
  const storedSubscriptions: SourceSubscription[] = Array.isArray(persisted.subscriptions)
    ? persisted.subscriptions
    : []

  const mergedSubscriptions = [...storedSubscriptions]
  envSubscriptions.forEach((envSub) => {
    const existingIndex = mergedSubscriptions.findIndex((s) => s.url === envSub.url)
    if (existingIndex > -1) {
      mergedSubscriptions[existingIndex] = {
        ...mergedSubscriptions[existingIndex],
        name: envSub.name,
        autoRefresh: true,
      }
    } else {
      mergedSubscriptions.push(envSub)
    }
  })

  const validSources = (
    Array.isArray(persisted.sources) ? persisted.sources : getDefaultSources()
  ).filter((s: any) => s && s.id && s.name && s.baseUrl)

  const validPremiumSources = (
    Array.isArray(persisted.premiumSources) ? persisted.premiumSources : getDefaultPremiumSources()
  ).filter((s: any) => s && s.id && s.name && s.baseUrl)

  return {
    sources: validSources,
    premiumSources: validPremiumSources,
    subscriptions: mergedSubscriptions.filter((s: any) => s && s.id && s.name && s.url),
    sortBy: persisted.sortBy || 'default',
    searchHistory: persisted.searchHistory !== undefined ? persisted.searchHistory : true,
    watchHistory: persisted.watchHistory !== undefined ? persisted.watchHistory : true,
    passwordAccess: persisted.passwordAccess !== undefined ? persisted.passwordAccess : false,
    accessPasswords: Array.isArray(persisted.accessPasswords) ? persisted.accessPasswords : [],
    autoNextEpisode: persisted.autoNextEpisode !== undefined ? persisted.autoNextEpisode : true,
    autoSkipIntro: persisted.autoSkipIntro !== undefined ? persisted.autoSkipIntro : false,
    skipIntroSeconds: typeof persisted.skipIntroSeconds === 'number' ? persisted.skipIntroSeconds : 30,
    autoSkipOutro: persisted.autoSkipOutro !== undefined ? persisted.autoSkipOutro : false,
    skipOutroSeconds: typeof persisted.skipOutroSeconds === 'number' ? persisted.skipOutroSeconds : 60,
    showModeIndicator: persisted.showModeIndicator !== undefined ? persisted.showModeIndicator : false,
    adFilter: persisted.adFilter !== undefined ? persisted.adFilter : false,
    adFilterMode: persisted.adFilterMode || 'heuristic',
    adKeywords: Array.isArray(persisted.adKeywords) ? persisted.adKeywords : [],
    realtimeLatency: persisted.realtimeLatency !== undefined ? persisted.realtimeLatency : false,
    searchDisplayMode: persisted.searchDisplayMode === 'grouped' ? 'grouped' : 'normal',
    episodeReverseOrder: persisted.episodeReverseOrder !== undefined ? persisted.episodeReverseOrder : false,
    fullscreenType: persisted.fullscreenType === 'window' ? 'window' : 'native',
    proxyMode:
      persisted.proxyMode === 'retry' || persisted.proxyMode === 'none' || persisted.proxyMode === 'always'
        ? persisted.proxyMode
        : 'retry',
    playerEngine: persisted.playerEngine === 'native' ? 'native' : 'veplayer',
    rememberScrollPosition:
      persisted.rememberScrollPosition !== undefined ? persisted.rememberScrollPosition : true,
  }
}

/**
 * Zustand vanilla store with localStorage persistence.
 * Use settingsStore.getSettings() / saveSettings() for access.
 */
const _store = createStore<AppSettings>()(
  persist(() => getDefaultAppSettings(), {
    name: SETTINGS_KEY,
    merge: (persisted, current) => {
      try {
        return mergePersistedSettings(persisted, current)
      } catch {
        return current
      }
    },
  }),
)

/**
 * React hook for reactive access to settings in components.
 * Usage: const sortBy = useSettingsStore(s => s.sortBy)
 */
export const useSettingsStore = <T>(selector: (state: AppSettings) => T): T =>
  useStore(_store, selector)

export const settingsStore = {
  getSettings(): AppSettings {
    if (typeof window === 'undefined') return getDefaultAppSettings()
    return _store.getState()
  },

  saveSettings(settings: AppSettings): void {
    if (typeof window === 'undefined') return
    _store.setState(settings, true)
  },

  subscribe(listener: () => void): () => void {
    return _store.subscribe(listener)
  },

  exportSettings(includeHistory = true): string {
    return exportSettings(this.getSettings(), includeHistory)
  },

  importSettings(jsonString: string): boolean {
    return importSettings(jsonString, (s) => this.saveSettings(s), this.getSettings())
  },

  syncEnvSubscriptions(rawEnvValue: string): void {
    if (typeof window === 'undefined') return

    const currentSettings = this.getSettings()
    const envSubs = getEnvSubscriptions(rawEnvValue)

    if (envSubs.length === 0) return

    const mergedSubscriptions = [...currentSettings.subscriptions]
    let changed = false

    envSubs.forEach((envSub) => {
      const existingIndex = mergedSubscriptions.findIndex((s) => s.url === envSub.url)
      if (existingIndex > -1) {
        if (mergedSubscriptions[existingIndex].name !== envSub.name) {
          mergedSubscriptions[existingIndex] = {
            ...mergedSubscriptions[existingIndex],
            name: envSub.name,
            autoRefresh: true,
          }
          changed = true
        }
      } else {
        mergedSubscriptions.push(envSub)
        changed = true
      }
    })

    if (changed) {
      this.saveSettings({ ...currentSettings, subscriptions: mergedSubscriptions })
    }
  },

  resetToDefaults(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem(SETTINGS_KEY)
    localStorage.removeItem(SEARCH_HISTORY_KEY)
    localStorage.removeItem(WATCH_HISTORY_KEY)

    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
    })

    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)))
    }
  },
}
