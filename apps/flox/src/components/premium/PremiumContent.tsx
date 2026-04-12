'use client'

import { TagManager } from '@/components/home/TagManager'
import { usePremiumContent } from '@/lib/hooks/usePremiumContent'
import { usePremiumTagManager } from '@/lib/hooks/usePremiumTagManager'
import { PremiumContentGrid } from './PremiumContentGrid'

export function PremiumContent() {
  const {
    tags,
    selectedTag,
    newTagInput,
    showTagManager,
    loading: isLoadingTags,
    setSelectedTag,
    setNewTagInput,
    setShowTagManager,
    handleAddTag,
    handleDeleteTag,
    handleRestoreDefaults,
    handleDragEnd,
  } = usePremiumTagManager()

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

      <PremiumContentGrid
        videos={videos}
        loading={loading}
        hasMore={hasMore}
        prefetchRef={prefetchRef}
        loadMoreRef={loadMoreRef}
      />
    </div>
  )
}
