/**
 * PopularFeatures - Main component for popular movies section
 * Uses /api/douban/recommend (search_subjects) with tag selection.
 */

'use client'

import { useCallback } from 'react'
import { InfiniteVideoGrid } from '@/components/search/InfiniteVideoGrid'
import { useTagManager } from '@/lib/hooks/useTagManager'
import type { Tag, Video } from '@/lib/types'
import { usePopularMovies } from './hooks/usePopularMovies'
import { TagManager } from './TagManager'

const DEFAULT_TAG: Tag = { id: 'popular', label: '热门', value: '热门' }

async function fetchDoubanTags(contentType: string): Promise<Tag[]> {
  const response = await fetch(`/api/douban/tags?type=${contentType}`)
  const data = await response.json()
  if (data.tags && Array.isArray(data.tags)) {
    const mappedTags: Tag[] = data.tags.map((label: string) => ({
      id: label === '热门' ? 'popular' : `tag_${label}`,
      label,
      value: label,
    }))
    if (!mappedTags.some((t) => t.value === '热门')) {
      mappedTags.unshift(DEFAULT_TAG)
    }
    return mappedTags
  }
  return [DEFAULT_TAG]
}

interface PopularFeaturesProps {
  onSearch?: (query: string) => void
  contentType: 'movie' | 'tv'
}

export function PopularFeatures({ contentType }: PopularFeaturesProps) {
  const fetchTags = useCallback(
    () => fetchDoubanTags(contentType),
    [contentType],
  )

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
    scope: `douban:${contentType}`,
    queryKey: ['doubanTags', contentType],
    fetchTags,
    defaultSelectedTag: 'popular',
    supportCustomTags: true,
  })

  const { movies, loading, hasMore, prefetchRef, loadMoreRef } =
    usePopularMovies(selectedTag, tags, contentType)

  const searchUrlBuilder = useCallback(
    (video: Video) => `/?q=${encodeURIComponent(video.vod_name)}`,
    [],
  )

  return (
    <div className="animate-fade-in">
      <TagManager
        tags={tags}
        selectedTag={selectedTag}
        showTagManager={showTagManager}
        newTagInput={newTagInput}
        isLoadingTags={isLoadingTags}
        onTagSelect={(tagId) => {
          if (
            tagId === 'custom_高级' ||
            tags.find((t) => t.id === tagId)?.label === '高级'
          ) {
            window.location.href = '/premium'
            return
          }
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
        videos={movies}
        loading={loading}
        hasMore={hasMore}
        prefetchRef={prefetchRef}
        loadMoreRef={loadMoreRef}
        urlBuilder={searchUrlBuilder}
      />
    </div>
  )
}
