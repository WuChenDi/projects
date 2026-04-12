'use client'

import { IKEmpty } from '@cdlab996/ui/IK'
import { FilmIcon } from 'lucide-react'
import type React from 'react'
import { useCallback, useState } from 'react'
import { VideoCard } from '@/components/search/VideoCard'
import type { Video } from '@/lib/types'

interface PremiumContentGridProps {
  videos: Video[]
  loading: boolean
  hasMore: boolean
  prefetchRef: React.RefObject<HTMLDivElement | null>
  loadMoreRef: React.RefObject<HTMLDivElement | null>
}

export function PremiumContentGrid({
  videos,
  loading,
  hasMore,
  prefetchRef,
  loadMoreRef,
}: PremiumContentGridProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  const handleCardClick = useCallback(
    (e: React.MouseEvent, cardId: string, videoUrl: string) => {
      if (window.innerWidth < 1024) {
        if (activeCardId === cardId) {
          window.location.href = videoUrl
        } else {
          e.preventDefault()
          setActiveCardId(cardId)
        }
      }
    },
    [activeCardId],
  )

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {videos.map((video, index) => {
          const cardId = `premium-${video.source}-${video.vod_id}-${index}`
          const params = new URLSearchParams()
          params.set('q', video.vod_name)
          const videoUrl = `/premium?${params.toString()}`

          return (
            <VideoCard
              key={cardId}
              video={video}
              videoUrl={videoUrl}
              cardId={cardId}
              isActive={activeCardId === cardId}
              onCardClick={handleCardClick}
              isPremium={true}
            />
          )
        })}
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

      {!hasMore && videos.length > 0 && (
        <IKEmpty title="没有更多内容了" showIcon={false} className="py-12" />
      )}
    </>
  )
}
