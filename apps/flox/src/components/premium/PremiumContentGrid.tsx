'use client'

import { Card } from '@cdlab996/ui/components/card'
import { FilmIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type React from 'react'
import type { Video } from '@/lib/types'

interface PremiumContentGridProps {
  videos: Video[]
  loading: boolean
  hasMore: boolean
  onVideoClick?: (video: Video) => void
  prefetchRef: React.RefObject<HTMLDivElement | null>
  loadMoreRef: React.RefObject<HTMLDivElement | null>
}

export function PremiumContentGrid({
  videos,
  loading,
  hasMore,
  onVideoClick,
  prefetchRef,
  loadMoreRef,
}: PremiumContentGridProps) {
  if (videos.length === 0 && !loading) {
    return <PremiumGridEmpty />
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 12313">
        {videos.map((video) => (
          <Link
            key={`${video.source}-${video.vod_id}`}
            href={`/premium?q=${encodeURIComponent(video.vod_name)}`}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              // Allow default behavior for modifier keys (new tab, etc.)
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

              e.preventDefault()
              onVideoClick?.(video)
            }}
            className="group cursor-pointer hover:translate-y-[-2px] transition-transform duration-200 ease-out"
            style={{
              position: 'relative',
              zIndex: 1,
              contentVisibility: 'auto',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) =>
              (e.currentTarget.style.zIndex = '100')
            }
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) =>
              (e.currentTarget.style.zIndex = '1')
            }
          >
            <Card className="p-0 h-full shadow-sm hover:shadow-md transition-shadow duration-200 ease-out">
              <div className="relative aspect-[2/3] bg-background/95 rounded-2xl">
                {video.vod_pic ? (
                  <Image
                    src={video.vod_pic}
                    alt={video.vod_name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105 rounded-2xl"
                    loading="eager"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    无封面
                  </div>
                )}
                {video.vod_remarks && (
                  <div className="absolute top-2 right-2 bg-black/80 px-2.5 py-1.5 flex items-center gap-1.5 rounded-full">
                    <span className="text-xs font-bold text-white">
                      {video.vod_remarks}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {video.vod_name}
                </h3>
                {video.type_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {video.type_name}
                  </p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Prefetch Trigger - Earlier */}
      {hasMore && !loading && <div ref={prefetchRef} className="h-1" />}

      {/* Loading Indicator */}
      {loading && <PremiumGridLoading />}

      {/* Intersection Observer Target */}
      {hasMore && !loading && <div ref={loadMoreRef} className="h-20" />}

      {/* No More Content */}
      {!hasMore && videos.length > 0 && <PremiumGridNoMore />}
    </>
  )
}

function PremiumGridLoading() {
  return (
    <div className="flex justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  )
}

function PremiumGridNoMore() {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">没有更多内容了</p>
    </div>
  )
}

function PremiumGridEmpty() {
  return (
    <div className="text-center py-20">
      <FilmIcon
        size={64}
        className="text-muted-foreground mx-auto mb-4"
      />
      <p className="text-muted-foreground">暂无内容</p>
    </div>
  )
}
