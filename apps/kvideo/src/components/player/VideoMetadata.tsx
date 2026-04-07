'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Card, CardContent } from '@cdlab996/ui/components/card'
import { CalendarIcon, CheckIcon, GlobeIcon } from 'lucide-react'
import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import { getSourceName } from '@/lib/utils/source-names'

interface VideoMetadataProps {
  videoData: any
  source: string | null
  title?: string | null
  videoId?: string | null
  isPremium?: boolean
}

export function VideoMetadata({
  videoData,
  source,
  title,
  videoId,
  isPremium,
}: VideoMetadataProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {videoData?.vod_pic && (
            <img
              src={videoData.vod_pic}
              alt={videoData.vod_name}
              className="w-24 h-36 sm:w-32 sm:h-48 object-cover rounded-lg border border-border flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                {videoData?.vod_name || title}
              </h1>
              {videoData && videoId && source && (
                <FavoriteButton
                  videoId={videoId}
                  source={source}
                  title={videoData.vod_name || title || '未知视频'}
                  poster={videoData.vod_pic}
                  type={videoData.type_name}
                  year={videoData.vod_year}
                  size={20}
                  isPremium={isPremium}
                  className="flex-shrink-0"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {source && (
                <Badge variant="default">
                  <CheckIcon className="size-3" />
                  {getSourceName(source)}
                </Badge>
              )}
              {videoData?.type_name && (
                <Badge variant="secondary">{videoData.type_name}</Badge>
              )}
              {videoData?.vod_year && (
                <Badge variant="outline">
                  <CalendarIcon className="size-3" />
                  {videoData.vod_year}
                </Badge>
              )}
              {videoData?.vod_area && (
                <Badge variant="outline">
                  <GlobeIcon className="size-3" />
                  {videoData.vod_area}
                </Badge>
              )}
            </div>

            {videoData?.vod_content && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {videoData.vod_content.replace(/<[^>]*>/g, '')}
              </p>
            )}

            {(videoData?.vod_actor || videoData?.vod_director) && (
              <div className="mt-3 space-y-1">
                {videoData?.vod_director && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">导演：</span>
                    {videoData.vod_director}
                  </p>
                )}
                {videoData?.vod_actor && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">主演：</span>
                    {videoData.vod_actor}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
