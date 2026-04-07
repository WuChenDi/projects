'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Globe, Tag } from 'lucide-react'
import { FilterBadges } from '@/components/search/FilterBadges'
import { VideoGrid } from '@/components/search/VideoGrid'
import { useSourceBadges } from '@/lib/hooks/useSourceBadges'
import { useTypeBadges } from '@/lib/hooks/useTypeBadges'
import type { SourceBadge, Video } from '@/lib/types'

interface SearchResultsProps {
  results: Video[]
  availableSources: SourceBadge[]
  loading: boolean
  isPremium?: boolean
  latencies?: Record<string, number>
}

export function SearchResults({
  results,
  availableSources,
  loading,
  isPremium = false,
  latencies = {},
}: SearchResultsProps) {
  // Source 过滤
  const {
    selectedSources,
    filteredVideos: sourceFilteredVideos,
    toggleSource,
  } = useSourceBadges(results, availableSources)

  // Type 过滤（基于 source 过滤后的结果）
  const {
    typeBadges,
    selectedTypes,
    filteredVideos: finalFilteredVideos,
    toggleType,
  } = useTypeBadges(sourceFilteredVideos)

  if (results.length === 0 && !loading) return null

  return (
    <div className="animate-fade-in">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>搜索结果</CardTitle>
          {!loading && (
            <CardAction>
              <Badge variant="default">{results.length} 个视频</Badge>
            </CardAction>
          )}
        </CardHeader>

        {(availableSources.length > 0 || typeBadges.length > 0) && (
          <CardContent className="flex flex-col gap-2">
            {availableSources.length > 0 && (
              <FilterBadges
                label="来源"
                icon={
                  <Globe className="size-3.5 text-muted-foreground shrink-0" />
                }
                items={availableSources.map((source) => ({
                  id: source.id,
                  name: source.name,
                  count: source.count,
                }))}
                selected={selectedSources}
                onToggle={toggleSource}
              />
            )}
            {typeBadges.length > 0 && (
              <FilterBadges
                label="分类"
                icon={
                  <Tag className="size-3.5 text-muted-foreground shrink-0" />
                }
                items={typeBadges.map((badge) => ({
                  id: badge.type,
                  name: badge.type,
                  count: badge.count,
                }))}
                selected={selectedTypes}
                onToggle={toggleType}
              />
            )}
          </CardContent>
        )}
      </Card>

      <VideoGrid
        videos={finalFilteredVideos}
        isPremium={isPremium}
        latencies={latencies}
      />
    </div>
  )
}
