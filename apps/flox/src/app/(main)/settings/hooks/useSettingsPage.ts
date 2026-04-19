import { useEffect, useState } from 'react'
import type {
  AdFilterMode,
  PlayerEngine,
  ProxyMode,
  SearchDisplayMode,
  SortOption,
} from '@/lib/store/settings-store'
import { getDefaultSources, settingsStore } from '@/lib/store/settings-store'
import type { SourceSubscription, VideoSource } from '@/lib/types'
import type { ImportResult } from '@/lib/utils/source-import-utils'
import {
  fetchSourcesFromUrl,
  mergeSources,
  parseSourcesFromJson,
} from '@/lib/utils/source-import-utils'

export function useSettingsPage() {
  const [sources, setSources] = useState<VideoSource[]>([])
  const [subscriptions, setSubscriptions] = useState<SourceSubscription[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isRestoreDefaultsDialogOpen, setIsRestoreDefaultsDialogOpen] =
    useState(false)
  const [editingSource, setEditingSource] = useState<VideoSource | null>(null)

  const [passwordAccess, setPasswordAccess] = useState(false)
  const [accessPasswords, setAccessPasswords] = useState<string[]>([])
  const [envPasswordSet, setEnvPasswordSet] = useState(false)

  // Display settings
  const [realtimeLatency, setRealtimeLatency] = useState(false)
  const [searchDisplayMode, setSearchDisplayMode] =
    useState<SearchDisplayMode>('normal')
  const [fullscreenType, setFullscreenType] = useState<'native' | 'window'>(
    'native',
  )
  const [proxyMode, setProxyMode] = useState<ProxyMode>('retry')
  const [playerEngine, setPlayerEngine] = useState<PlayerEngine>('veplayer')
  const [rememberScrollPosition, setRememberScrollPosition] = useState(true)
  const [adFilterMode, setAdFilterMode] = useState<AdFilterMode>('heuristic')
  const [adKeywords, setAdKeywords] = useState<string[]>([])

  useEffect(() => {
    const settings = settingsStore.getSettings()
    setSources(settings.sources || [])
    setSubscriptions(settings.subscriptions || [])
    setSortBy(settings.sortBy)
    setPasswordAccess(settings.passwordAccess)
    setAccessPasswords(settings.accessPasswords)
    setRealtimeLatency(settings.realtimeLatency)
    setSearchDisplayMode(settings.searchDisplayMode)
    setFullscreenType(settings.fullscreenType)
    setProxyMode(settings.proxyMode)
    setPlayerEngine(settings.playerEngine)
    setRememberScrollPosition(settings.rememberScrollPosition)
    setAdFilterMode(settings.adFilterMode)
    setAdKeywords(settings.adKeywords)

    // Fetch env password status
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvPasswordSet(data.hasEnvPassword))
      .catch(() => setEnvPasswordSet(false))
  }, [])

  const handleSourcesChange = (newSources: VideoSource[]) => {
    setSources(newSources)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      sources: newSources,
      sortBy,
      subscriptions,
      searchHistory: true,
      watchHistory: true,
      passwordAccess,
      accessPasswords,
    })
  }

  const handleAddSource = (source: VideoSource) => {
    const exists = sources.some((s) => s.id === source.id)
    const updated = exists
      ? sources.map((s) => (s.id === source.id ? source : s))
      : [...sources, source]
    handleSourcesChange(updated)
    setEditingSource(null)
  }

  const handleEditSource = (source: VideoSource) => {
    setEditingSource(source)
    setIsAddModalOpen(true)
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      sources,
      sortBy: newSort,
      searchHistory: true,
      watchHistory: true,
      passwordAccess,
      accessPasswords,
    })
  }

  const handlePasswordToggle = (enabled: boolean) => {
    setPasswordAccess(enabled)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      sources,
      sortBy,
      searchHistory: true,
      watchHistory: true,
      passwordAccess: enabled,
      accessPasswords,
    })
  }

  const handleAddPassword = (password: string) => {
    const updated = [...accessPasswords, password]
    setAccessPasswords(updated)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      sources,
      sortBy,
      searchHistory: true,
      watchHistory: true,
      passwordAccess,
      accessPasswords: updated,
    })
  }

  const handleRemovePassword = (password: string) => {
    const updated = accessPasswords.filter((p) => p !== password)
    setAccessPasswords(updated)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      sources,
      sortBy,
      searchHistory: true,
      watchHistory: true,
      passwordAccess,
      accessPasswords: updated,
    })
  }

  const handleExport = (
    includeSearchHistory: boolean,
    includeWatchHistory: boolean,
  ) => {
    const data = settingsStore.exportSettings(
      includeSearchHistory || includeWatchHistory,
    )
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flox-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (jsonString: string): boolean => {
    // 1. Try to import as full settings backup
    const asBackupSuccess = settingsStore.importSettings(jsonString)
    if (asBackupSuccess) {
      const settings = settingsStore.getSettings()
      setSources(settings.sources)
      setSortBy(settings.sortBy)
      setSubscriptions(settings.subscriptions || [])
      setPasswordAccess(settings.passwordAccess)
      setAccessPasswords(settings.accessPasswords)

      // Reload to apply changes
      setTimeout(() => window.location.reload(), 1000)

      return true
    }

    // 2. Try to import as source list (JSON format)
    try {
      const result = parseSourcesFromJson(jsonString)
      if (result.totalCount > 0) {
        return handleImportLink(result, false) // Reuse link import logic
      }
    } catch {
      return false
    }

    return false
  }

  const handleImportLink = (
    result: ImportResult,
    isSync: boolean = false,
  ): boolean => {
    try {
      // Merge normal sources
      let updatedSources = mergeSources(sources, result.normalSources)

      // Merge premium sources if needed
      const currentSettings = settingsStore.getSettings()
      let updatedPremiumSources = mergeSources(
        currentSettings.premiumSources,
        result.premiumSources,
      )

      // Save everything
      settingsStore.saveSettings({
        ...currentSettings,
        sources: updatedSources,
        premiumSources: updatedPremiumSources,
      })

      setSources(updatedSources) // Update local state

      // If strictly creating/editing subscription, we don't reload page usually, but here we might want to refresh UI
      if (!isSync) {
        setTimeout(() => window.location.reload(), 1000)
      }

      return true
    } catch (e) {
      console.error('Import error:', e)
      return false
    }
  }

  // Subscription Handlers
  const handleAddSubscription = async (
    sub: SourceSubscription,
  ): Promise<boolean> => {
    // Verify we can fetch it
    try {
      const result = await fetchSourcesFromUrl(sub.url)

      // Import the content
      handleImportLink(result, true)

      // Add subscription to store
      const newSubscriptions = [...subscriptions, sub]
      setSubscriptions(newSubscriptions)

      const currentSettings = settingsStore.getSettings()
      settingsStore.saveSettings({
        ...currentSettings,
        subscriptions: newSubscriptions,
      })

      return true
    } catch (e) {
      console.error(e)
      throw new Error('无法连接到订阅链接或格式错误')
    }
  }

  const handleRemoveSubscription = (id: string) => {
    const newSubscriptions = subscriptions.filter((s) => s.id !== id)
    setSubscriptions(newSubscriptions)

    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      subscriptions: newSubscriptions,
    })
  }

  const handleRefreshSubscription = async (sub: SourceSubscription) => {
    try {
      const result = await fetchSourcesFromUrl(sub.url)
      handleImportLink(result, true)

      // Update last updated timestamp
      const updatedSubscriptions = subscriptions.map((s) =>
        s.id === sub.id ? { ...s, lastUpdated: Date.now() } : s,
      )
      setSubscriptions(updatedSubscriptions)

      const currentSettings = settingsStore.getSettings()
      settingsStore.saveSettings({
        ...currentSettings,
        subscriptions: updatedSubscriptions,
      })
    } catch (e) {
      console.error(e)
      // Optionally notify user of failure
    }
  }

  const handleRealtimeLatencyChange = (enabled: boolean) => {
    setRealtimeLatency(enabled)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      realtimeLatency: enabled,
    })
  }

  const handleSearchDisplayModeChange = (mode: SearchDisplayMode) => {
    setSearchDisplayMode(mode)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      searchDisplayMode: mode,
    })
  }

  const handleFullscreenTypeChange = (type: 'native' | 'window') => {
    setFullscreenType(type)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      fullscreenType: type,
    })
  }

  const handleProxyModeChange = (mode: ProxyMode) => {
    setProxyMode(mode)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      proxyMode: mode,
    })
  }

  const handlePlayerEngineChange = (engine: PlayerEngine) => {
    setPlayerEngine(engine)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      playerEngine: engine,
    })
  }

  const handleRememberScrollPositionChange = (enabled: boolean) => {
    setRememberScrollPosition(enabled)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      rememberScrollPosition: enabled,
    })
  }

  const handleAdFilterModeChange = (mode: AdFilterMode) => {
    setAdFilterMode(mode)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      adFilterMode: mode,
      adFilter: mode !== 'off',
    })
  }

  const handleAdKeywordsChange = (keywords: string[]) => {
    setAdKeywords(keywords)
    const currentSettings = settingsStore.getSettings()
    settingsStore.saveSettings({
      ...currentSettings,
      adKeywords: keywords,
    })
  }

  const handleRestoreDefaults = () => {
    const defaults = getDefaultSources()
    handleSourcesChange(defaults)
    setIsRestoreDefaultsDialogOpen(false)
  }

  const handleResetAll = () => {
    settingsStore.resetToDefaults()
    setIsResetDialogOpen(false)
    window.location.reload()
  }

  return {
    sources,
    subscriptions,
    sortBy,
    passwordAccess,
    accessPasswords,
    envPasswordSet,
    realtimeLatency,
    searchDisplayMode,
    isAddModalOpen,
    isExportModalOpen,
    isImportModalOpen,
    isResetDialogOpen,
    isRestoreDefaultsDialogOpen,
    setIsAddModalOpen,
    setIsExportModalOpen,
    setIsImportModalOpen,
    setIsResetDialogOpen,
    setIsRestoreDefaultsDialogOpen,
    setEditingSource,
    handleSourcesChange,
    handleAddSource,
    handleSortChange,
    handlePasswordToggle,
    handleAddPassword,
    handleRemovePassword,
    handleExport,
    handleImportFile, // Renamed from handleImport
    handleImportLink, // New
    handleAddSubscription, // New
    handleRemoveSubscription, // New
    handleRefreshSubscription, // New
    handleRestoreDefaults,
    handleResetAll,
    editingSource,
    handleEditSource,
    handleRealtimeLatencyChange,
    handleSearchDisplayModeChange,
    fullscreenType,
    handleFullscreenTypeChange,
    proxyMode,
    handleProxyModeChange,
    playerEngine,
    handlePlayerEngineChange,
    rememberScrollPosition,
    handleRememberScrollPositionChange,
    adFilterMode,
    adKeywords,
    handleAdFilterModeChange,
    handleAdKeywordsChange,
  }
}
