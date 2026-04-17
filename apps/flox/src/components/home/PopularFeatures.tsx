/**
 * PopularFeatures - Main component for popular movies section
 * Displays Douban movie recommendations with tag filtering and infinite scroll
 * Supports advanced filtering mode via Douban new_search_subjects API
 */

'use client'

import { Button } from '@cdlab996/ui/components/button'
import { SlidersHorizontalIcon } from 'lucide-react'
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
  const [advancedMode, setAdvancedMode] = useState(false)

  // Standard tag-based browsing
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

  // Advanced filter browsing
  const {
    filter,
    updateFilter,
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1" />
        <Button
          variant={advancedMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAdvancedMode(!advancedMode)}
        >
          <SlidersHorizontalIcon className="size-4" />
          高级筛选
        </Button>
      </div>

      {advancedMode ? (
        <>
          <AdvancedFilter filter={filter} onFilterChange={updateFilter} />
          <MovieGrid
            movies={filterMovies}
            loading={filterLoading}
            hasMore={filterHasMore}
            onMovieClick={handleMovieClick}
            prefetchRef={filterPrefetchRef}
            loadMoreRef={filterLoadMoreRef}
          />
        </>
      ) : (
        <>
          <TagManager
            tags={tags}
            selectedTag={selectedTag}
            showTagManager={showTagManager}
            newTagInput={newTagInput}
            onTagSelect={(tagId) => {
              if (
                tagId === 'custom_高级' ||
                tags.find((t) => t.id === tagId)?.label === '高级'
              ) {
                setAdvancedMode(true)
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
            isLoadingTags={isLoadingTags}
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
      )}
    </div>
  )
}
