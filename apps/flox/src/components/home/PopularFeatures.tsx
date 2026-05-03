/**
 * PopularFeatures - Main component for popular movies section
 * Two browsing modes:
 *   - Tag mode: uses /api/douban/recommend (search_subjects)
 *   - Advanced filter mode: uses /api/douban/filter (new_search_subjects)
 */

'use client'

import { useCallback, useState } from 'react'
import { InfiniteVideoGrid } from '@/components/search/InfiniteVideoGrid'
import { useAdvancedFilter } from '@/lib/hooks/useAdvancedFilter'
import { useTagManager } from '@/lib/hooks/useTagManager'
import type { Tag, Video } from '@/lib/types'
import { AdvancedFilter } from './AdvancedFilter'
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

export function PopularFeatures({
  onSearch,
  contentType,
}: PopularFeaturesProps) {
  const [mode, setMode] = useState<'tag' | 'filter'>('tag')

  const fetchTags = useCallback(
    () => fetchDoubanTags(contentType),
    [contentType],
  )

  // Tag mode: /api/douban/recommend
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
    storageKey: `flox_custom_tags_${contentType}`,
    queryKey: ['doubanTags', contentType],
    fetchTags,
    defaultSelectedTag: 'popular',
    supportCustomTags: true,
  })

  const {
    movies: tagMovies,
    loading: tagLoading,
    hasMore: tagHasMore,
    prefetchRef: tagPrefetchRef,
    loadMoreRef: tagLoadMoreRef,
  } = usePopularMovies(selectedTag, tags, contentType)

  // Filter mode: /api/douban/filter
  const {
    filter,
    updateFilter,
    presets,
    presetsLoading,
    movies: filterMovies,
    loading: filterLoading,
    hasMore: filterHasMore,
    prefetchRef: filterPrefetchRef,
    loadMoreRef: filterLoadMoreRef,
  } = useAdvancedFilter(contentType)

  const searchUrlBuilder = useCallback(
    (video: Video) => `/?q=${encodeURIComponent(video.vod_name)}`,
    [],
  )

  return (
    <div className="animate-fade-in">
      {mode === 'tag' ? (
        <>
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
            videos={tagMovies}
            loading={tagLoading}
            hasMore={tagHasMore}
            prefetchRef={tagPrefetchRef}
            loadMoreRef={tagLoadMoreRef}
            urlBuilder={searchUrlBuilder}
          />
        </>
      ) : (
        <>
          <AdvancedFilter
            filter={filter}
            presets={presets}
            presetsLoading={presetsLoading}
            onFilterChange={updateFilter}
          />

          <InfiniteVideoGrid
            videos={filterMovies}
            loading={filterLoading}
            hasMore={filterHasMore}
            prefetchRef={filterPrefetchRef}
            loadMoreRef={filterLoadMoreRef}
            urlBuilder={searchUrlBuilder}
          />
        </>
      )}
    </div>
  )
}
