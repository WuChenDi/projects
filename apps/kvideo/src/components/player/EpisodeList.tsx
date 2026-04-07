'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import { IKEmpty } from '@cdlab996/ui/IK'
import { ArrowUpDownIcon, InboxIcon, ListIcon, PlayIcon } from 'lucide-react'
import { useCallback, useMemo, useRef } from 'react'
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation'

interface Episode {
  name?: string
  url: string
}

interface EpisodeListProps {
  episodes: Episode[] | null
  currentEpisode: number
  isReversed?: boolean
  onEpisodeClick: (episode: Episode, index: number) => void
  onToggleReverse?: (reversed: boolean) => void
}

export function EpisodeList({
  episodes,
  currentEpisode,
  isReversed = false,
  onEpisodeClick,
  onToggleReverse,
}: EpisodeListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const displayEpisodes = useMemo(() => {
    if (!episodes) return null
    return isReversed ? [...episodes].reverse() : episodes
  }, [episodes, isReversed])

  const getOriginalIndex = useCallback(
    (displayIndex: number) => {
      if (!episodes || !isReversed) return displayIndex
      return episodes.length - 1 - displayIndex
    },
    [episodes, isReversed],
  )

  const getDisplayIndex = useCallback(
    (originalIndex: number) => {
      if (!episodes || !isReversed) return originalIndex
      return episodes.length - 1 - originalIndex
    },
    [episodes, isReversed],
  )

  useKeyboardNavigation({
    enabled: true,
    containerRef: listRef,
    currentIndex: getDisplayIndex(currentEpisode),
    itemCount: episodes?.length || 0,
    orientation: 'vertical',
    onNavigate: useCallback((index: number) => {
      buttonRefs.current[index]?.focus()
      buttonRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, []),
    onSelect: useCallback(
      (displayIndex: number) => {
        if (episodes) {
          const originalIndex = getOriginalIndex(displayIndex)
          if (episodes[originalIndex]) {
            onEpisodeClick(episodes[originalIndex], originalIndex)
          }
        }
      },
      [episodes, onEpisodeClick, getOriginalIndex],
    ),
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListIcon className="size-4" />
          <CardTitle>选集</CardTitle>
          {episodes && <Badge variant="secondary">{episodes.length}</Badge>}
        </div>

        {episodes && episodes.length > 1 && (
          <CardAction>
            <Button
              variant={isReversed ? 'default' : 'outline'}
              size="icon-xs"
              onClick={() => onToggleReverse?.(!isReversed)}
              aria-label={isReversed ? '恢复正序' : '倒序排列'}
            >
              <ArrowUpDownIcon className="size-3.5" />
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="flex-1">
          <div
            ref={listRef}
            className="space-y-1"
            role="radiogroup"
            aria-label="剧集选择"
          >
            {displayEpisodes && displayEpisodes.length > 0 ? (
              displayEpisodes.map((episode, displayIndex) => {
                const originalIndex = getOriginalIndex(displayIndex)
                const isCurrentEpisode = currentEpisode === originalIndex

                return (
                  <Button
                    key={originalIndex}
                    ref={(el) => {
                      buttonRefs.current[displayIndex] = el
                    }}
                    variant={isCurrentEpisode ? 'default' : 'outline'}
                    className="h-8 w-full justify-between text-sm font-normal"
                    onClick={() => onEpisodeClick(episode, originalIndex)}
                    role="radio"
                    aria-checked={isCurrentEpisode}
                  >
                    <span className="truncate">
                      {episode.name || `第 ${originalIndex + 1} 集`}
                    </span>
                    {isCurrentEpisode && (
                      <PlayIcon className="size-3.5 shrink-0" />
                    )}
                  </Button>
                )
              })
            ) : (
              <IKEmpty
                title="暂无剧集信息"
                icon={InboxIcon}
                iconClassName="size-10 opacity-50"
                className="py-12"
              />
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
