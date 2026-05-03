import { useEffect, useState } from 'react'
import {
  getDefaultPremiumSources,
  getDefaultSources,
  settingsStore,
} from '@/lib/store/settings-store'
import type { VideoSource } from '@/lib/types'

interface UseSourceSettingsOptions {
  isPremium?: boolean
}

export function useSourceSettings({
  isPremium = false,
}: UseSourceSettingsOptions = {}) {
  const [sources, setSources] = useState<VideoSource[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRestoreDefaultsDialogOpen, setIsRestoreDefaultsDialogOpen] =
    useState(false)
  const [editingSource, setEditingSource] = useState<VideoSource | null>(null)

  useEffect(() => {
    const settings = settingsStore.getSettings()
    setSources(
      isPremium ? settings.premiumSources || [] : settings.sources || [],
    )
  }, [isPremium])

  const handleSourcesChange = (newSources: VideoSource[]) => {
    setSources(newSources)
    const currentSettings = settingsStore.getSettings()
    if (isPremium) {
      settingsStore.saveSettings({
        ...currentSettings,
        premiumSources: newSources,
      })
    } else {
      settingsStore.saveSettings({
        ...currentSettings,
        sources: newSources,
      })
    }
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

  const handleRestoreDefaults = () => {
    const defaults = isPremium ? getDefaultPremiumSources() : getDefaultSources()
    handleSourcesChange(defaults)
    setIsRestoreDefaultsDialogOpen(false)
  }

  return {
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
  }
}
