import { useState } from 'react'
import {
  getDefaultPremiumSources,
  getDefaultSources,
  useSettingsStore,
} from '@/lib/store/settings-store'
import type { VideoSource } from '@/lib/types'

interface UseSourceSettingsOptions {
  isPremium?: boolean
}

export function useSourceSettings({
  isPremium = false,
}: UseSourceSettingsOptions = {}) {
  const sources = useSettingsStore((s) =>
    isPremium ? s.premiumSources : s.sources,
  )
  const setSources = useSettingsStore((s) => s.setSources)
  const setPremiumSources = useSettingsStore((s) => s.setPremiumSources)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRestoreDefaultsDialogOpen, setIsRestoreDefaultsDialogOpen] =
    useState(false)
  const [editingSource, setEditingSource] = useState<VideoSource | null>(null)

  const handleSourcesChange = (next: VideoSource[]) => {
    if (isPremium) setPremiumSources(next)
    else setSources(next)
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
    handleSourcesChange(
      isPremium ? getDefaultPremiumSources() : getDefaultSources(),
    )
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
