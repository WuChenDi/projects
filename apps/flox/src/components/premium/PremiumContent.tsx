'use client'

import { useCallback } from 'react'
import { TagManager } from '@/components/home/TagManager'
import { InfiniteVideoGrid } from '@/components/search/InfiniteVideoGrid'
import { usePremiumContent } from '@/lib/hooks/usePremiumContent'
import { useTagManager } from '@/lib/hooks/useTagManager'
import { settingsStore } from '@/lib/store/settings-store'
import type { Tag } from '@/lib/types'

async function fetchPremiumTypes(): Promise<Tag[]> {
  const enabledSources = settingsStore
    .getSettings()
    .premiumSources.filter((s) => s.enabled)
  const response = await fetch('/api/premium/types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources: enabledSources }),
  })
  const data = await response.json()
  return Array.isArray(data.tags) ? data.tags : []
}

export function PremiumContent() {
  const enabledSources = settingsStore
    .getSettings()
    .premiumSources.filter((s) => s.enabled)
  const sourcesKey = enabledSources.map((s) => s.id).join(',')

  const {
    tags,
    selectedTag,
    newTagInput,
    showTagManager,
    isLoadingTags,
    setSelectedTag,
    setNewTagInput,
    setShowTagManager,
    handleAddTag,
    handleDeleteTag,
    handleRestoreDefaults,
    handleDragEnd,
  } = useTagManager({
    storageKey: 'flox_premium_custom_tags',
    queryKey: ['premiumTypes', sourcesKey],
    fetchTags: useCallback(() => fetchPremiumTypes(), []),
    defaultSelectedTag: 'recommend',
  })

  // Get the category value from selected tag
  const categoryValue = tags.find((t) => t.id === selectedTag)?.value || ''

  const { videos, loading, hasMore, prefetchRef, loadMoreRef } =
    usePremiumContent(categoryValue)

  return (
    <div className="animate-fade-in">
      <TagManager
        tags={tags}
        selectedTag={selectedTag}
        showTagManager={showTagManager}
        newTagInput={newTagInput}
        isLoadingTags={isLoadingTags}
        onTagSelect={(tagId) => {
          setSelectedTag(tagId)
        }}
        onTagDelete={handleDeleteTag}
        onToggleManager={() => setShowTagManager(!showTagManager)}
        onRestoreDefaults={handleRestoreDefaults}
        onNewTagInputChange={setNewTagInput}
        onAddTag={handleAddTag}
        onDragEnd={handleDragEnd}
      />

      <InfiniteVideoGrid
        videos={videos}
        loading={loading}
        hasMore={hasMore}
        prefetchRef={prefetchRef}
        loadMoreRef={loadMoreRef}
        isPremium
      />
    </div>
  )
}
