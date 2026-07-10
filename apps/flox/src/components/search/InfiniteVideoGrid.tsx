'use client'

import { cn } from '@cdlab/ui/lib/utils'
import { IKEmpty } from '@cdlab/ui/IK'
import { FilmIcon } from 'lucide-react'
import type { Video } from '@/lib/types'
import { VideoCardSkeleton } from './VideoCard'
import { VideoGrid } from './VideoGrid'

const GRID_CLASS =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-[1920px] mx-auto'

interface InfiniteVideoGridProps {
  videos: Video[]
  loading: boolean
  hasMore: boolean
  prefetchRef: React.RefObject<HTMLDivElement | null>
  loadMoreRef: React.RefObject<HTMLDivElement | null>
  isPremium?: boolean
  latencies?: Record<string, number>
  urlBuilder?: (video: Video) => string
}

export function InfiniteVideoGrid({
  videos,
  loading,
  hasMore,
  prefetchRef,
  loadMoreRef,
  isPremium = false,
  latencies,
  urlBuilder,
}: InfiniteVideoGridProps) {
  if (videos.length === 0 && !loading) {
    return (
      <IKEmpty
        title="暂无内容"
        icon={FilmIcon}
        iconClassName="size-4 text-muted-foreground"
      />
    )
  }

  if (videos.length === 0 && loading) {
    return (
      <div className={cn(GRID_CLASS)}>
        {Array.from({ length: 12 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton items have no natural key
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <>
      <VideoGrid
        videos={videos}
        isPremium={isPremium}
        latencies={latencies}
        urlBuilder={urlBuilder}
      />

      {hasMore && !loading && <div ref={prefetchRef} className="h-1" />}

      {loading && (
        <div className={cn(GRID_CLASS, 'mt-4')}>
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton items have no natural key
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {hasMore && !loading && <div ref={loadMoreRef} className="h-20" />}

      {!hasMore && videos.length > 0 && (
        <IKEmpty title="没有更多内容了" showIcon={false} className="py-12" />
      )}
    </>
  )
}
