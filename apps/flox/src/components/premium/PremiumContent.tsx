'use client'

import { TagManager } from '@/components/home/TagManager'
import { usePremiumContent } from '@/lib/hooks/usePremiumContent'
import { usePremiumTagManager } from '@/lib/hooks/usePremiumTagManager'
import { PremiumContentGrid } from './PremiumContentGrid'

interface PremiumContentProps {
  onSearch?: (query: string) => void
}

export function PremiumContent({ onSearch }: PremiumContentProps) {
  const {
    tags,
    selectedTag,
    newTagInput,
    showTagManager,
    justAddedTag,
    setSelectedTag,
    setNewTagInput,
    setShowTagManager,
    setJustAddedTag,
    handleAddTag,
    handleDeleteTag,
    handleRestoreDefaults,
    handleDragEnd,
  } = usePremiumTagManager()

  // Get the category value from selected tag
  const categoryValue = tags.find((t) => t.id === selectedTag)?.value || ''

  const { videos, loading, hasMore, prefetchRef, loadMoreRef } =
    usePremiumContent(categoryValue)

  const handleVideoClick = (video: any) => {
    if (onSearch) {
      onSearch(video.vod_name)
    }
  }

  return (
    <div className="animate-fade-in">
      <TagManager
        tags={tags}
        selectedTag={selectedTag}
        showTagManager={showTagManager}
        newTagInput={newTagInput}
        justAddedTag={justAddedTag}
        onTagSelect={(tagId) => {
          setSelectedTag(tagId)
        }}
        onTagDelete={handleDeleteTag}
        onToggleManager={() => setShowTagManager(!showTagManager)}
        onRestoreDefaults={handleRestoreDefaults}
        onNewTagInputChange={setNewTagInput}
        onAddTag={handleAddTag}
        onDragEnd={handleDragEnd}
        onJustAddedTagHandled={() => setJustAddedTag(false)}
      />

      <PremiumContentGrid
        videos={videos}
        loading={loading}
        hasMore={hasMore}
        onVideoClick={handleVideoClick}
        prefetchRef={prefetchRef}
        loadMoreRef={loadMoreRef}
      />
    </div>
  )
}
