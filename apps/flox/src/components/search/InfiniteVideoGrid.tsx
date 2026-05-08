'use client'

import { Spinner } from '@cdlab996/ui/components/spinner'
import { IKEmpty } from '@cdlab996/ui/IK'
import { FilmIcon } from 'lucide-react'
import type { Video } from '@/lib/types'
import { VideoGrid } from './VideoGrid'

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
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="size-6" />
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      )}

      {hasMore && !loading && <div ref={loadMoreRef} className="h-20" />}

      {!hasMore && videos.length > 0 && (
        <IKEmpty title="没有更多内容了" showIcon={false} className="py-12" />
      )}
    </>
  )
}
