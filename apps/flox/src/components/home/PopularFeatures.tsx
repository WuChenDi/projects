/**
 * PopularFeatures - Main component for popular movies section
 * Displays Douban movie recommendations with tag filtering and infinite scroll
 */

'use client'

import { usePopularMovies } from './hooks/usePopularMovies'
import { useTagManager } from './hooks/useTagManager'
import { MovieGrid } from './MovieGrid'
import { TagManager } from './TagManager'

interface PopularFeaturesProps {
  onSearch?: (query: string) => void
  contentType: 'movie' | 'tv'
}

export function PopularFeatures({ onSearch, contentType }: PopularFeaturesProps) {
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
    isLoadingTags,
  } = useTagManager(contentType)

  const { movies, loading, hasMore, prefetchRef, loadMoreRef } =
    usePopularMovies(selectedTag, tags, contentType)

  const handleMovieClick = (movie: any) => {
    if (onSearch) {
      onSearch(movie.title)
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
        onJustAddedTagHandled={() => setJustAddedTag(false)}
        isLoadingTags={isLoadingTags}
      />

      <MovieGrid
        movies={movies}
        loading={loading}
        hasMore={hasMore}
        onMovieClick={handleMovieClick}
        prefetchRef={prefetchRef}
        loadMoreRef={loadMoreRef}
      />
    </div>
  )
}
