import { IKEmpty } from '@cdlab996/ui/IK'
import { FilmIcon } from 'lucide-react'
import { MovieCard } from './MovieCard'

interface DoubanMovie {
  id: string
  title: string
  cover: string
  rate: string
  url: string
}

interface MovieGridProps {
  movies: DoubanMovie[]
  loading: boolean
  hasMore: boolean
  onMovieClick: (movie: DoubanMovie) => void
  prefetchRef: React.RefObject<HTMLDivElement | null>
  loadMoreRef: React.RefObject<HTMLDivElement | null>
}

export function MovieGrid({
  movies,
  loading,
  hasMore,
  onMovieClick,
  prefetchRef,
  loadMoreRef,
}: MovieGridProps) {
  if (movies.length === 0 && !loading) {
    return (
      <IKEmpty
        title="暂无内容"
        icon={FilmIcon}
        iconClassName="size-4 text-muted-foreground"
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onMovieClick={onMovieClick} />
        ))}
      </div>

      {hasMore && !loading && <div ref={prefetchRef} className="h-1" />}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      )}

      {hasMore && !loading && <div ref={loadMoreRef} className="h-20" />}

      {!hasMore && movies.length > 0 && (
        <IKEmpty title="没有更多内容了" showIcon={false} className="py-12" />
      )}
    </>
  )
}
