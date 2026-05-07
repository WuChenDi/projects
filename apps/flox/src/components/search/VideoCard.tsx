'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Card } from '@cdlab996/ui/components/card'
import { cn } from '@cdlab996/ui/lib/utils'
import { CalendarIcon, FilmIcon, LayersIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { memo, useMemo, useState } from 'react'
import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import { LatencyBadge } from '@/components/ui/LatencyBadge'
import { WatchLaterButton } from '@/components/watch-later/WatchLaterButton'
import type { Video } from '@/lib/types'
import { parseVideoTitle } from '@/lib/utils/video'

interface VideoCardProps {
  video: Video
  videoUrl: string
  cardId: string
  isActive: boolean
  onCardClick: (e: React.MouseEvent, cardId: string, videoUrl: string) => void
  isPremium?: boolean
  latencies?: Record<string, number>
  isGrouped?: boolean
  groupVideos?: Video[]
}

export const VideoCard = memo<VideoCardProps>(
  ({
    video,
    videoUrl,
    cardId,
    isActive,
    onCardClick,
    isPremium = false,
    latencies = {},
    isGrouped = false,
    groupVideos = [],
  }) => {
    const representativeVideo = useMemo(() => {
      if (!isGrouped || groupVideos.length === 0) return video
      return groupVideos[0]
    }, [isGrouped, groupVideos, video])

    const displayLatency = useMemo(() => {
      if (!isGrouped) {
        return latencies[video.source] ?? video.latency
      }

      const allLatencies = groupVideos
        .map((v) => latencies[v.source] ?? v.latency)
        .filter((l): l is number => l !== undefined)

      return allLatencies.length > 0 ? Math.min(...allLatencies) : undefined
    }, [video.source, latencies, isGrouped, groupVideos, video.latency])

    const sourceCount = isGrouped ? groupVideos.length : 1

    const displayName = representativeVideo.vod_name
    const { cleanTitle, quality } = parseVideoTitle(displayName)

    // Detect rating format (e.g. "⭐ 8.5") — show as badge, not as text
    const isRating = representativeVideo.vod_remarks?.startsWith('⭐')
    const ratingText = isRating ? representativeVideo.vod_remarks : undefined
    const displayQuality =
      quality || (isRating ? undefined : representativeVideo.vod_remarks)

    const [imageError, setImageError] = useState(false)

    return (
      <div className="group relative">
        <Link
          href={videoUrl}
          onClick={(e) => onCardClick(e, cardId, videoUrl)}
          role="listitem"
          aria-label={`${displayName}${representativeVideo.vod_remarks ? ` - ${representativeVideo.vod_remarks}` : ''}`}
          prefetch={false}
          className="block h-full transition-transform duration-200 active:scale-[0.985] hover:-translate-y-0.5"
        >
          <Card
            className={cn(
              'h-full overflow-hidden border cursor-pointer transition-all p-0',
              'hover:border-primary/60 hover:shadow-xl hover:-translate-y-0.5',
            )}
          >
            <div className="relative aspect-square bg-muted overflow-hidden">
              {!imageError && representativeVideo.vod_pic ? (
                <Image
                  src={representativeVideo.vod_pic}
                  alt={displayName}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
                  loading="eager"
                  unoptimized
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : null}

              {(imageError || !representativeVideo.vod_pic) && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <FilmIcon size={64} className="text-muted-foreground/40" />
                </div>
              )}

              <div className="absolute top-3 left-3 right-3 z-10 flex justify-between gap-2">
                {isGrouped && video.sourceName !== '豆瓣' ? (
                  <Badge className="bg-primary text-primary-foreground flex items-center gap-1 shadow-sm">
                    <LayersIcon size={13} />
                    {sourceCount} 源
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="truncate max-w-[52%]">
                    {video.sourceName}
                  </Badge>
                )}

                {ratingText && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-0.5 shadow-sm"
                  >
                    {ratingText}
                  </Badge>
                )}

                {displayLatency !== undefined && (
                  <LatencyBadge latency={displayLatency} />
                )}
              </div>

              <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
                <FavoriteButton
                  videoId={representativeVideo.vod_id}
                  source={representativeVideo.source}
                  title={displayName}
                  poster={representativeVideo.vod_pic}
                  sourceName={representativeVideo.sourceName}
                  type={representativeVideo.type_name}
                  year={representativeVideo.vod_year}
                  remarks={representativeVideo.vod_remarks}
                  size={17}
                  className="shadow-md"
                  isPremium={isPremium}
                />
                <WatchLaterButton
                  videoId={representativeVideo.vod_id}
                  source={representativeVideo.source}
                  title={displayName}
                  poster={representativeVideo.vod_pic}
                  sourceName={representativeVideo.sourceName}
                  type={representativeVideo.type_name}
                  year={representativeVideo.vod_year}
                  remarks={representativeVideo.vod_remarks}
                  size={17}
                  className="shadow-md"
                  isPremium={isPremium}
                />
              </div>

              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300',
                  isActive
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <div className="absolute bottom-0 left-0 right-0 p-3.5">
                  {isActive && (
                    <div className="lg:hidden text-white text-xs mb-2 font-medium">
                      再次点击播放 →
                    </div>
                  )}

                  {representativeVideo.type_name && (
                    <Badge
                      variant="outline"
                      className="mb-2 text-white border-white/30 bg-white/10"
                    >
                      {representativeVideo.type_name}
                    </Badge>
                  )}

                  {representativeVideo.vod_year && (
                    <div className="flex items-center gap-1.5 text-white/90 text-xs">
                      <CalendarIcon size={13} />
                      <span>{representativeVideo.vod_year}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pb-3.5 px-3.5 flex flex-col flex-1">
              <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground mb-1.5">
                {cleanTitle}
              </h4>

              {displayQuality && (
                <p className="text-xs text-muted-foreground font-medium line-clamp-1">
                  {displayQuality}
                </p>
              )}

              {representativeVideo.vod_remarks &&
                !isRating &&
                representativeVideo.vod_remarks !== displayQuality && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {representativeVideo.vod_remarks}
                  </p>
                )}
            </div>
          </Card>
        </Link>
      </div>
    )
  },
)

VideoCard.displayName = 'VideoCard'
