import { useState } from 'react'
import { toast } from 'sonner'
import { useSourceSettings } from '@/lib/hooks/useSourceSettings'
import { clearAppCaches, resetAllStores } from '@/lib/store/registry'
import { exportSettings, importSettings } from '@/lib/store/settings-helpers'
import { useSettingsStore } from '@/lib/store/settings-store'
import type { SourceSubscription } from '@/lib/types'
import type { ImportResult } from '@/lib/utils/source-import-utils'
import {
  fetchSourcesFromUrl,
  parseSourcesFromJson,
} from '@/lib/utils/source-import-utils'

interface UseSettingsPageOptions {
  isPremium?: boolean
}

export function useSettingsPage({
  isPremium = false,
}: UseSettingsPageOptions = {}) {
  const {
    sources,
    isAddModalOpen,
    isRestoreDefaultsDialogOpen,
    editingSource,
    setIsAddModalOpen,
    setIsRestoreDefaultsDialogOpen,
    setEditingSource,
    handleSourcesChange,
    handleAddSource,
    handleEditSource,
    handleRestoreDefaults,
  } = useSourceSettings({ isPremium })

  const subscriptions = useSettingsStore((s) => s.subscriptions)
  const sortBy = useSettingsStore((s) => s.sortBy)
  const realtimeLatency = useSettingsStore((s) => s.realtimeLatency)
  const searchDisplayMode = useSettingsStore((s) => s.searchDisplayMode)
  const fullscreenType = useSettingsStore((s) => s.fullscreenType)
  const proxyMode = useSettingsStore((s) => s.proxyMode)
  const rememberScrollPosition = useSettingsStore(
    (s) => s.rememberScrollPosition,
  )
  const adFilterMode = useSettingsStore((s) => s.adFilterMode)
  const adKeywords = useSettingsStore((s) => s.adKeywords)

  const setSortBy = useSettingsStore((s) => s.setSortBy)
  const setRealtimeLatency = useSettingsStore((s) => s.setRealtimeLatency)
  const setSearchDisplayMode = useSettingsStore((s) => s.setSearchDisplayMode)
  const setFullscreenType = useSettingsStore((s) => s.setFullscreenType)
  const setProxyMode = useSettingsStore((s) => s.setProxyMode)
  const setRememberScrollPosition = useSettingsStore(
    (s) => s.setRememberScrollPosition,
  )
  const setAdFilterMode = useSettingsStore((s) => s.setAdFilterMode)
  const setAdKeywords = useSettingsStore((s) => s.setAdKeywords)
  const addSubscription = useSettingsStore((s) => s.addSubscription)
  const removeSubscription = useSettingsStore((s) => s.removeSubscription)
  const markSubscriptionRefreshed = useSettingsStore(
    (s) => s.markSubscriptionRefreshed,
  )
  const toggleSubscriptionAutoRefresh = useSettingsStore(
    (s) => s.toggleSubscriptionAutoRefresh,
  )
  const mergeImportedSources = useSettingsStore((s) => s.mergeImportedSources)

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const handleExport = (
    includeSearchHistory: boolean,
    includeWatchHistory: boolean,
  ) => {
    const data = exportSettings({
      includeSearchHistory,
      includeHistory: includeWatchHistory,
    })
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flox-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportLink = (
    result: ImportResult,
    isSync: boolean = false,
  ): boolean => {
    try {
      mergeImportedSources({
        normalSources: result.normalSources,
        premiumSources: result.premiumSources,
      })
      if (!isSync) {
        setTimeout(() => window.location.reload(), 1000)
      }
      return true
    } catch (e) {
      console.error('Import error:', e)
      return false
    }
  }

  const handleImportFile = (jsonString: string): boolean => {
    if (importSettings(jsonString)) {
      setTimeout(() => window.location.reload(), 1000)
      return true
    }

    try {
      const result = parseSourcesFromJson(jsonString)
      if (result.totalCount > 0) {
        return handleImportLink(result, false)
      }
    } catch {
      return false
    }

    return false
  }

  const handleAddSubscription = async (
    sub: SourceSubscription,
  ): Promise<boolean> => {
    try {
      const result = await fetchSourcesFromUrl(sub.url)
      handleImportLink(result, true)
      addSubscription(sub)
      return true
    } catch (e) {
      console.error(e)
      throw new Error('无法连接到订阅链接或格式错误')
    }
  }

  const handleRefreshSubscription = async (sub: SourceSubscription) => {
    try {
      const result = await fetchSourcesFromUrl(sub.url)
      handleImportLink(result, true)
      markSubscriptionRefreshed(sub.id)
      toast.success(`「${sub.name}」更新成功，共 ${result.totalCount} 个源`)
    } catch {
      toast.error(`「${sub.name}」更新失败，请检查链接是否有效`)
    }
  }

  const handleResetAll = async () => {
    resetAllStores()
    await clearAppCaches()
    setIsResetDialogOpen(false)
    window.location.reload()
  }

  return {
    sources,
    subscriptions,
    sortBy,
    realtimeLatency,
    searchDisplayMode,
    fullscreenType,
    proxyMode,
    rememberScrollPosition,
    adFilterMode,
    adKeywords,

    isAddModalOpen,
    isExportModalOpen,
    isImportModalOpen,
    isResetDialogOpen,
    isRestoreDefaultsDialogOpen,
    editingSource,

    setIsAddModalOpen,
    setIsExportModalOpen,
    setIsImportModalOpen,
    setIsResetDialogOpen,
    setIsRestoreDefaultsDialogOpen,
    setEditingSource,

    handleSourcesChange,
    handleAddSource,
    handleEditSource,
    handleRestoreDefaults,
    handleResetAll,
    handleSortChange: setSortBy,
    handleRealtimeLatencyChange: setRealtimeLatency,
    handleSearchDisplayModeChange: setSearchDisplayMode,
    handleFullscreenTypeChange: setFullscreenType,
    handleProxyModeChange: setProxyMode,
    handleRememberScrollPositionChange: setRememberScrollPosition,
    handleAdFilterModeChange: setAdFilterMode,
    handleAdKeywordsChange: setAdKeywords,

    handleExport,
    handleImportFile,
    handleImportLink,
    handleAddSubscription,
    handleRemoveSubscription: removeSubscription,
    handleRefreshSubscription,
    handleToggleAutoRefresh: toggleSubscriptionAutoRefresh,
  }
}
