'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { Card } from '@cdlab996/ui/components/card'
import { IKEmpty, IKPageContainer } from '@cdlab996/ui/IK'
import { CalendarIcon, FilmIcon, StarIcon, TrophyIcon } from 'lucide-react'
import Image from 'next/image'
import { Suspense, useState } from 'react'
import type { RankingMovie } from '@/lib/hooks/useRanking'
import { RANKING_CATEGORIES, useRanking } from '@/lib/hooks/useRanking'

function RankingCard({
  movie,
  index,
  onMovieClick,
}: {
  movie: RankingMovie
  index: number
  onMovieClick: (title: string) => void
}) {
  const [imageError, setImageError] = useState(false)
  const score = Array.isArray(movie.score) ? movie.score[0] : ''
  const rank = index + 1

  return (
    <Card
      className="flex gap-4 p-3 cursor-pointer hover:border-primary/60 hover:shadow-lg transition-all"
      onClick={() => onMovieClick(movie.title)}
    >
      {/* Rank number */}
      <div className="flex items-center justify-center shrink-0 w-8">
        <span
          className={`text-lg font-bold ${
            rank <= 3 ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {rank}
        </span>
      </div>

      {/* Poster */}
      <div className="relative w-16 h-22 shrink-0 rounded overflow-hidden bg-muted">
        {!imageError && movie.cover_url ? (
          <Image
            src={movie.cover_url}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="64px"
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FilmIcon size={24} className="text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h3 className="font-semibold text-sm truncate">{movie.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {movie.types && movie.types.length > 0 && (
            <span>{movie.types.join(' / ')}</span>
          )}
          {movie.regions && movie.regions.length > 0 && (
            <span>{movie.regions[0]}</span>
          )}
          {movie.release_date && (
            <span className="flex items-center gap-0.5">
              <CalendarIcon size={11} />
              {movie.release_date}
            </span>
          )}
        </div>
        {movie.vote_count > 0 && (
          <span className="text-xs text-muted-foreground">
            {movie.vote_count.toLocaleString()} 人评价
          </span>
        )}
      </div>

      {/* Score */}
      {score && parseFloat(score) > 0 && (
        <div className="flex items-center shrink-0">
          <Badge variant="secondary">
            <StarIcon className="text-yellow-400 fill-yellow-400 size-3" />
            {score}
          </Badge>
        </div>
      )}
    </Card>
  )
}

function RankingPage() {
  const {
    selectedCategory,
    setSelectedCategory,
    movies,
    loading,
    hasMore,
    prefetchRef,
    loadMoreRef,
  } = useRanking()

  const handleMovieClick = (title: string) => {
    // Navigate to home with search
    window.location.href = `/?q=${encodeURIComponent(title)}`
  }

  return (
    <IKPageContainer>
      <div className="max-w-4xl mx-auto w-full pb-20">
        {/* Title */}
        <div className="my-6 flex items-center gap-2">
          <TrophyIcon className="size-5 text-primary" />
          <h1 className="text-xl font-bold">豆瓣排行榜</h1>
        </div>

        {/* Category selector */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {RANKING_CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory.id === cat.id ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Ranking list */}
        <div className="space-y-3">
          {movies.map((movie, index) => (
            <RankingCard
              key={movie.id || index}
              movie={movie}
              index={index}
              onMovieClick={handleMovieClick}
            />
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

        {!loading && movies.length === 0 && (
          <IKEmpty
            title="暂无排行数据"
            icon={TrophyIcon}
            iconClassName="size-4 text-muted-foreground"
          />
        )}
      </div>
    </IKPageContainer>
  )
}

export default function Ranking() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <RankingPage />
    </Suspense>
  )
}
