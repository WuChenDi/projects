/**
 * PopularFeatures - Main component for popular movies section
 * Two browsing modes:
 *   - Tag mode: uses /api/douban/recommend (search_subjects)
 *   - Advanced filter mode: uses /api/douban/filter (new_search_subjects)
 */

'use client'

import { useState } from 'react'
import { useAdvancedFilter } from '@/lib/hooks/useAdvancedFilter'
import { AdvancedFilter } from './AdvancedFilter'
import { usePopularMovies } from './hooks/usePopularMovies'
import { useTagManager } from './hooks/useTagManager'
import { MovieGrid } from './MovieGrid'
import { TagManager } from './TagManager'

interface PopularFeaturesProps {
  onSearch?: (query: string) => void
  contentType: 'movie' | 'tv'
}

export function PopularFeatures({
  onSearch,
  contentType,
}: PopularFeaturesProps) {
  const [mode, setMode] = useState<'tag' | 'filter'>('tag')

  // Tag mode: /api/douban/recommend
  const {
    tags,
    selectedTag,
    newTagInput,
    showTagManager,
    setSelectedTag,
    setNewTagInput,
    setShowTagManager,
    handleAddTag,
    handleDeleteTag,
    handleRestoreDefaults,
    handleDragEnd,
    isLoadingTags,
  } = useTagManager(contentType)

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

  const handleMovieClick = (movie: any) => {
    if (onSearch) {
      onSearch(movie.title)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* <div className="flex items-center justify-end mb-2">
        <Button
          variant={mode === 'filter' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode(mode === 'tag' ? 'filter' : 'tag')}
        >
          <SlidersHorizontalIcon className="size-4" />
          {mode === 'tag' ? '高级筛选' : '标签浏览'}
        </Button>
      </div> */}

      {mode === 'tag' ? (
        <>
          <TagManager
            tags={tags}
            selectedTag={selectedTag}
            showTagManager={showTagManager}
            newTagInput={newTagInput}
            isLoadingTags={isLoadingTags}
            // onTagSelect={setSelectedTag}
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

          <MovieGrid
            movies={tagMovies}
            loading={tagLoading}
            hasMore={tagHasMore}
            onMovieClick={handleMovieClick}
            prefetchRef={tagPrefetchRef}
            loadMoreRef={tagLoadMoreRef}
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

          <MovieGrid
            movies={filterMovies}
            loading={filterLoading}
            hasMore={filterHasMore}
            onMovieClick={handleMovieClick}
            prefetchRef={filterPrefetchRef}
            loadMoreRef={filterLoadMoreRef}
          />
        </>
      )}
    </div>
  )
}
