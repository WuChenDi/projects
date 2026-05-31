/**
 * Settings Store - Application-wide preferences, sources, subscriptions.
 * zustand hook + persist + actions inlined. State accessed via
 * `useSettingsStore(selector)` in components, or `useSettingsStore.getState()`
 * outside React.
 */

import { DEFAULT_SOURCES } from '@/lib/api/default-sources'
import { PREMIUM_SOURCES } from '@/lib/api/premium-sources'
import type { SourceSubscription, VideoSource } from '@/lib/types'
import {
  createSubscription,
  mergeSources,
} from '@/lib/utils/source-import-utils'
import { createPersistedStore } from './create-persisted-store'

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

export interface SettingsState {
  sources: VideoSource[]
  premiumSources: VideoSource[]
  subscriptions: SourceSubscription[]
  sortBy: SortOption
  searchHistory: boolean
  watchHistory: boolean
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
  rememberScrollPosition: boolean
  vConsole: boolean
}

export interface SettingsActions {
  patch: (partial: Partial<SettingsState>) => void
  replaceAll: (state: SettingsState) => void

  setSortBy: (v: SortOption) => void
  setSearchDisplayMode: (v: SearchDisplayMode) => void
  setRealtimeLatency: (v: boolean) => void
  setRememberScrollPosition: (v: boolean) => void
  setFullscreenType: (v: 'native' | 'window') => void
  setProxyMode: (v: ProxyMode) => void
  setEpisodeReverseOrder: (v: boolean) => void
  setVConsole: (v: boolean) => void

  setAutoNextEpisode: (v: boolean) => void
  setAutoSkipIntro: (v: boolean) => void
  setSkipIntroSeconds: (v: number) => void
  setAutoSkipOutro: (v: boolean) => void
  setSkipOutroSeconds: (v: number) => void
  setShowModeIndicator: (v: boolean) => void

  setAdFilter: (v: boolean) => void
  /** Sets the ad filter mode and toggles `adFilter` accordingly (off → false, anything else → true). */
  setAdFilterMode: (v: AdFilterMode) => void
  setAdKeywords: (v: string[]) => void

  setSources: (v: VideoSource[]) => void
  setPremiumSources: (v: VideoSource[]) => void
  mergeImportedSources: (input: {
    normalSources?: VideoSource[]
    premiumSources?: VideoSource[]
  }) => void

  addSubscription: (sub: SourceSubscription) => void
  removeSubscription: (id: string) => void
  markSubscriptionRefreshed: (id: string) => void
  toggleSubscriptionAutoRefresh: (id: string) => void
  syncEnvSubscriptions: (rawEnvValue: string) => void
}

export type AppSettings = SettingsState

export const SETTINGS_STORE_KEY = 'flox:settings'

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
            item &&
            typeof item.name === 'string' &&
            typeof item.url === 'string',
        )
        .map((item: any) => createSubscription(item.name, item.url))
    }
  } catch {
    // Not JSON, fall through to URL parsing
  }

  if (envValue.includes('http')) {
    const urls = envValue
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)
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

function getDefaultSettingsState(): SettingsState {
  return {
    sources: getDefaultSources(),
    premiumSources: getDefaultPremiumSources(),
    subscriptions: getEnvSubscriptions(),
    sortBy: 'default',
    searchHistory: true,
    watchHistory: true,
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
    rememberScrollPosition: true,
    vConsole: false,
  }
}

/**
 * Validate persisted state against defaults; merge env-provided subscriptions
 * (re-applied on every hydration so SUBSCRIPTION_SOURCES env var stays authoritative).
 */
function mergePersistedSettings(
  persisted: unknown,
  defaults: SettingsState,
): SettingsState {
  const data = (persisted ?? {}) as Partial<SettingsState> & Record<string, any>

  const envSubscriptions = getEnvSubscriptions()
  const stored: SourceSubscription[] = Array.isArray(data.subscriptions)
    ? data.subscriptions
    : []

  const mergedSubscriptions = [...stored]
  envSubscriptions.forEach((envSub) => {
    const i = mergedSubscriptions.findIndex((s) => s.url === envSub.url)
    if (i > -1) {
      mergedSubscriptions[i] = {
        ...mergedSubscriptions[i],
        name: envSub.name,
        autoRefresh: true,
      }
    } else {
      mergedSubscriptions.push(envSub)
    }
  })

  const isVideoSource = (s: any) => s && s.id && s.name && s.baseUrl

  return {
    sources: (Array.isArray(data.sources)
      ? data.sources
      : defaults.sources
    ).filter(isVideoSource),
    premiumSources: (Array.isArray(data.premiumSources)
      ? data.premiumSources
      : defaults.premiumSources
    ).filter(isVideoSource),
    subscriptions: mergedSubscriptions.filter(
      (s: any) => s && s.id && s.name && s.url,
    ),
    sortBy: data.sortBy || defaults.sortBy,
    searchHistory: data.searchHistory ?? defaults.searchHistory,
    watchHistory: data.watchHistory ?? defaults.watchHistory,
    autoNextEpisode: data.autoNextEpisode ?? defaults.autoNextEpisode,
    autoSkipIntro: data.autoSkipIntro ?? defaults.autoSkipIntro,
    skipIntroSeconds:
      typeof data.skipIntroSeconds === 'number'
        ? data.skipIntroSeconds
        : defaults.skipIntroSeconds,
    autoSkipOutro: data.autoSkipOutro ?? defaults.autoSkipOutro,
    skipOutroSeconds:
      typeof data.skipOutroSeconds === 'number'
        ? data.skipOutroSeconds
        : defaults.skipOutroSeconds,
    showModeIndicator: data.showModeIndicator ?? defaults.showModeIndicator,
    adFilter: data.adFilter ?? defaults.adFilter,
    adFilterMode: data.adFilterMode || defaults.adFilterMode,
    adKeywords: Array.isArray(data.adKeywords)
      ? data.adKeywords
      : defaults.adKeywords,
    realtimeLatency: data.realtimeLatency ?? defaults.realtimeLatency,
    searchDisplayMode:
      data.searchDisplayMode === 'grouped' ? 'grouped' : 'normal',
    episodeReverseOrder:
      data.episodeReverseOrder ?? defaults.episodeReverseOrder,
    fullscreenType: data.fullscreenType === 'window' ? 'window' : 'native',
    proxyMode:
      data.proxyMode === 'retry' ||
      data.proxyMode === 'none' ||
      data.proxyMode === 'always'
        ? data.proxyMode
        : defaults.proxyMode,
    rememberScrollPosition:
      data.rememberScrollPosition ?? defaults.rememberScrollPosition,
    vConsole: data.vConsole ?? defaults.vConsole,
  }
}

export const useSettingsStore = createPersistedStore<
  SettingsState,
  SettingsActions
>({
  key: SETTINGS_STORE_KEY,
  defaultState: getDefaultSettingsState,
  merge: mergePersistedSettings,
  actions: (set, get) => ({
    patch: (partial) =>
      set(partial as Partial<SettingsState & SettingsActions>),
    replaceAll: (state) =>
      set(state as Partial<SettingsState & SettingsActions>),

    setSortBy: (v) => set({ sortBy: v }),
    setSearchDisplayMode: (v) => set({ searchDisplayMode: v }),
    setRealtimeLatency: (v) => set({ realtimeLatency: v }),
    setRememberScrollPosition: (v) => set({ rememberScrollPosition: v }),
    setFullscreenType: (v) => set({ fullscreenType: v }),
    setProxyMode: (v) => set({ proxyMode: v }),
    setEpisodeReverseOrder: (v) => set({ episodeReverseOrder: v }),
    setVConsole: (v) => set({ vConsole: v }),

    setAutoNextEpisode: (v) => set({ autoNextEpisode: v }),
    setAutoSkipIntro: (v) => set({ autoSkipIntro: v }),
    setSkipIntroSeconds: (v) => set({ skipIntroSeconds: Math.max(0, v) }),
    setAutoSkipOutro: (v) => set({ autoSkipOutro: v }),
    setSkipOutroSeconds: (v) => set({ skipOutroSeconds: Math.max(0, v) }),
    setShowModeIndicator: (v) => set({ showModeIndicator: v }),

    setAdFilter: (v) => set({ adFilter: v }),
    setAdFilterMode: (v) => set({ adFilterMode: v, adFilter: v !== 'off' }),
    setAdKeywords: (v) => set({ adKeywords: v }),

    setSources: (v) => set({ sources: v }),
    setPremiumSources: (v) => set({ premiumSources: v }),
    mergeImportedSources: ({ normalSources, premiumSources }) => {
      const current = get()
      const next: Partial<SettingsState> = {}
      if (normalSources?.length) {
        next.sources = mergeSources(current.sources, normalSources)
      }
      if (premiumSources?.length) {
        next.premiumSources = mergeSources(
          current.premiumSources,
          premiumSources,
        )
      }
      if (Object.keys(next).length > 0) {
        set(next as Partial<SettingsState & SettingsActions>)
      }
    },

    addSubscription: (sub) =>
      set((s) => ({ subscriptions: [...s.subscriptions, sub] })),
    removeSubscription: (id) =>
      set((s) => ({
        subscriptions: s.subscriptions.filter((sub) => sub.id !== id),
      })),
    markSubscriptionRefreshed: (id) =>
      set((s) => ({
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id ? { ...sub, lastUpdated: Date.now() } : sub,
        ),
      })),
    toggleSubscriptionAutoRefresh: (id) =>
      set((s) => ({
        subscriptions: s.subscriptions.map((sub) =>
          sub.id === id ? { ...sub, autoRefresh: !sub.autoRefresh } : sub,
        ),
      })),
    syncEnvSubscriptions: (rawEnvValue) => {
      if (typeof window === 'undefined') return
      const envSubs = getEnvSubscriptions(rawEnvValue)
      if (envSubs.length === 0) return

      const current = get().subscriptions
      const merged = [...current]
      let changed = false

      envSubs.forEach((envSub) => {
        const i = merged.findIndex((s) => s.url === envSub.url)
        if (i > -1) {
          if (merged[i].name !== envSub.name) {
            merged[i] = { ...merged[i], name: envSub.name, autoRefresh: true }
            changed = true
          }
        } else {
          merged.push(envSub)
          changed = true
        }
      })

      if (changed) set({ subscriptions: merged })
    },
  }),
})
