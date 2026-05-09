'use client'

import { cn } from '@cdlab996/ui/lib/utils'
import { usePathname, useSearchParams } from 'next/navigation'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSettingsStore } from '@/lib/store/settings-store'
import type { Video } from '@/lib/types'
import { VideoCard } from './VideoCard'

interface VideoGridProps {
  videos: Video[]
  className?: string
  isPremium?: boolean
  latencies?: Record<string, number>
  /** Custom URL builder. When provided, overrides the default /player?... URL generation. */
  urlBuilder?: (video: Video) => string
}

export const VideoGrid = memo(function VideoGrid({
  videos,
  className = '',
  isPremium = false,
  latencies = {},
  urlBuilder,
}: VideoGridProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(24)
  const displayMode = useSettingsStore((s) => s.searchDisplayMode)

  const gridRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const { rememberScrollPosition } = useSettingsStore.getState()

    const params = searchParams.toString()
    const scrollKey = `scroll-pos:${pathname}${params ? '?' + params : ''}`
    const savedPos = sessionStorage.getItem(scrollKey)

    if (savedPos && rememberScrollPosition) {
      const position = parseInt(savedPos, 10)
      if (!isNaN(position) && position > 500) {
        const estimatedRowsNeeded = Math.ceil(position / 300) + 2
        const itemsPerRow =
          window.innerWidth >= 1280
            ? 6
            : window.innerWidth >= 1024
              ? 5
              : window.innerWidth >= 768
                ? 4
                : window.innerWidth >= 640
                  ? 3
                  : 2

        const neededCount = Math.min(
          videos.length,
          estimatedRowsNeeded * itemsPerRow,
        )
        if (neededCount > 24) {
          setVisibleCount(Math.ceil(neededCount / 24) * 24)
        }
      }
    }
  }, [pathname, searchParams, videos.length])

  const groupedVideos = useMemo(() => {
    if (displayMode !== 'grouped') return []

    const groups = new Map<string, Video[]>()

    videos.forEach((video) => {
      const name = video.vod_name.toLowerCase().trim()
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name)!.push(video)
    })

    return Array.from(groups.values()).map((groupVideos) => {
      const sorted = [...groupVideos].sort(
        (a, b) => (a.latency ?? Infinity) - (b.latency ?? Infinity),
      )
      return {
        representative: sorted[0],
        videos: sorted,
        name: sorted[0].vod_name,
      }
    })
  }, [videos, displayMode])

  // ====================== 加载更多 Observer ======================
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect()

    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => prev + 24)
          }
        },
        { rootMargin: '400px' },
      )
      observerRef.current.observe(node)
    }
  }, [])

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

  const renderedItems = useMemo(() => {
    const isGroupedMode = displayMode === 'grouped'
    const itemsToRender = isGroupedMode ? groupedVideos : videos

    return itemsToRender.slice(0, visibleCount).map((item, index) => {
      const isGrouped = isGroupedMode
      const group = isGrouped ? (item as any) : null

      const cardId = isGrouped
        ? `group-${group.representative.vod_id}-${index}`
        : `${(item as Video).vod_id}-${index}`

      const isActive = activeCardId === cardId

      // 生成 URL
      let videoData = item as Video
      let videoUrl: string

      if (urlBuilder) {
        videoData = isGrouped ? (group as any).representative : (item as Video)
        videoUrl = urlBuilder(videoData)
      } else {
        const params = new URLSearchParams()

        if (isGrouped) {
          const g = group as any
          params.set('id', String(g.representative.vod_id))
          params.set('source', g.representative.source)
          params.set('title', g.representative.vod_name)

          if (g.videos.length > 1) {
            const groupData = g.videos.map((v: Video) => ({
              id: v.vod_id,
              source: v.source,
              sourceName: v.sourceName,
              latency: v.latency,
              pic: v.vod_pic,
            }))
            params.set('groupedSources', JSON.stringify(groupData))
          }
          videoData = g.representative
        } else {
          const v = item as Video
          params.set('id', String(v.vod_id))
          params.set('source', v.source)
          params.set('title', v.vod_name)
          if (isPremium) params.set('premium', '1')
        }

        videoUrl = `/player?${params.toString()}`
      }

      return (
        <VideoCard
          key={cardId}
          video={videoData}
          videoUrl={videoUrl}
          cardId={cardId}
          isActive={isActive}
          onCardClick={handleCardClick}
          isPremium={isPremium}
          latencies={latencies}
          isGrouped={isGrouped}
          groupVideos={isGrouped ? (group as any).videos : []}
        />
      )
    })
  }, [
    displayMode,
    groupedVideos,
    videos,
    visibleCount,
    activeCardId,
    isPremium,
    latencies,
    urlBuilder,
    handleCardClick,
  ])

  if (videos.length === 0) return null

  const totalItems =
    displayMode === 'grouped' ? groupedVideos.length : videos.length

  return (
    <>
      <div
        ref={gridRef}
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-4 max-w-[1920px] mx-auto',
          className,
        )}
        role="list"
        aria-label="视频搜索结果"
      >
        {renderedItems}
      </div>

      {visibleCount < totalItems && (
        <div
          ref={loadMoreRef}
          className="h-20 w-full flex items-center justify-center opacity-0 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </>
  )
})
