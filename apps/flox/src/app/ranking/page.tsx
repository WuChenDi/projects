'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { Card } from '@cdlab996/ui/components/card'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { IKEmpty, IKPageContainer } from '@cdlab996/ui/IK'
import { cn } from '@cdlab996/ui/lib/utils'
import {
  CalendarIcon,
  FilmIcon,
  MedalIcon,
  StarIcon,
  TrophyIcon,
} from 'lucide-react'
import Image from 'next/image'
import { Suspense, useState } from 'react'
import type { RankingMovie } from '@/lib/hooks/useRanking'
import { RANKING_CATEGORIES, useRanking } from '@/lib/hooks/useRanking'

const MEDAL_STYLES: Record<
  number,
  { border: string; chip: string; label: string }
> = {
  1: {
    border: 'border-amber-300/60 hover:border-amber-400/80',
    chip: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    label: '冠军',
  },
  2: {
    border: 'border-slate-300/60 hover:border-slate-400/80',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    label: '亚军',
  },
  3: {
    border: 'border-orange-300/50 hover:border-orange-400/80',
    chip: 'bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
    label: '季军',
  },
}

function scoreTone(score: number) {
  if (score >= 9) return { text: 'text-emerald-300', bg: 'bg-emerald-950' }
  if (score >= 8) return { text: 'text-amber-300', bg: 'bg-amber-950' }
  if (score >= 7) return { text: 'text-orange-300', bg: 'bg-orange-950' }
  return { text: 'text-muted-foreground', bg: 'bg-muted' }
}

function RankingCard({
  movie,
  onMovieClick,
}: {
  movie: RankingMovie
  onMovieClick: (title: string) => void
}) {
  const [imageError, setImageError] = useState(false)
  const rank = movie.rank
  const isTopThree = rank >= 1 && rank <= 3
  const medal = MEDAL_STYLES[rank]
  const scoreValue = parseFloat(movie.score)
  const { text: scoreToneText, bg: scoreBg } = scoreTone(scoreValue)

  return (
    <div className="group relative">
      <Card
        className={cn(
          'h-full overflow-hidden border cursor-pointer transition-all p-0',
          'hover:border-primary/60 hover:shadow-xl hover:-translate-y-0.5',
          isTopThree && medal?.border,
        )}
        onClick={() => onMovieClick(movie.title)}
        role="listitem"
      >
        <div className="relative aspect-square bg-muted overflow-hidden">
          {!imageError && movie.cover_url ? (
            <Image
              src={movie.cover_url}
              alt={movie.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              unoptimized
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <FilmIcon size={40} className="text-muted-foreground/40" />
            </div>
          )}

          <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-start gap-1">
            <div className="flex items-center gap-1">
              {isTopThree && medal ? (
                <Badge
                  className={cn(
                    'flex items-center gap-0.5 shadow-sm',
                    medal.chip,
                  )}
                >
                  <MedalIcon className="size-3" strokeWidth={2} />
                  {rank}
                </Badge>
              ) : (
                <Badge>#{rank}</Badge>
              )}

              <Badge variant="secondary">豆瓣</Badge>
            </div>

            {!Number.isNaN(scoreValue) && scoreValue > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'flex items-center gap-0.5 shadow-sm',
                  scoreBg,
                  scoreToneText,
                )}
              >
                <StarIcon className="size-2.5 fill-current" />
                {movie.score}
              </Badge>
            )}
          </div>

          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300',
              'opacity-0 group-hover:opacity-100',
            )}
          >
            <div className="absolute bottom-0 left-0 right-0 p-3">
              {movie.types && movie.types.length > 0 && (
                <Badge
                  variant="outline"
                  className="mb-1.5 text-white border-white/30 bg-white/10 text-[10px]"
                >
                  {movie.types[0]}
                </Badge>
              )}
              {movie.release_date && (
                <div className="flex items-center gap-1 text-white/90 text-xs">
                  <CalendarIcon size={11} />
                  <span>{movie.release_date}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pb-3.5 px-3.5 flex flex-col flex-1">
          <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground mb-1.5">
            {movie.title}
          </h4>

          {movie.actors && movie.actors.length > 0 && (
            <p className="text-xs text-muted-foreground font-medium line-clamp-1">
              {movie.actors.slice(0, 2).join(' · ')}
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}

function RankingCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden p-0">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
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
    window.location.href = `/?q=${encodeURIComponent(title)}`
  }

  const isInitialLoading = loading && movies.length === 0

  return (
    <IKPageContainer>
      <div className="max-w-7xl mx-auto w-full">
        <div className="my-6 flex items-center gap-2">
          <TrophyIcon className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">豆瓣排行榜</h1>
          <span className="text-xs text-muted-foreground ml-1">
            按 90% 评分区间排名
          </span>
        </div>

        <div className="sticky top-0 z-10 -mx-4 sm:mx-0 mb-4 px-4 sm:px-0 py-2">
          <div className="flex flex-wrap gap-2">
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
        </div>

        {isInitialLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
              <RankingCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-4"
            role="list"
          >
            {movies.map((movie, index) => (
              <RankingCard
                key={movie.id || index}
                movie={movie}
                onMovieClick={handleMovieClick}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && <div ref={prefetchRef} className="h-1" />}

        {loading && movies.length > 0 && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              加载更多...
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
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <RankingPage />
    </Suspense>
  )
}
