/**
 * FavoriteButton - Reusable favorite toggle button
 * Heart icon that fills when favorited, with animation
 */

'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cdlab996/ui/components/tooltip'
import { cn } from '@cdlab996/ui/lib/utils'
import { HeartIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'
import { useFavorites } from '@/lib/store/favorites-store'

interface FavoriteButtonProps {
  videoId: string | number
  source: string
  title: string
  poster?: string
  sourceName?: string
  type?: string
  year?: string
  remarks?: string
  className?: string
  size?: number
  showTooltip?: boolean
  isPremium?: boolean
  /** Use plain ghost style (for list item actions). Defaults to card-overlay style. */
  plain?: boolean
}

export const FavoriteButton = memo<FavoriteButtonProps>(
  ({
    videoId,
    source,
    title,
    poster,
    sourceName,
    type,
    year,
    remarks,
    className = '',
    size = 20,
    showTooltip = true,
    isPremium = false,
    plain = false,
  }) => {
    const { isFavorite, toggleFavorite } = useFavorites(isPremium)
    const [isAnimating, setIsAnimating] = useState(false)
    const [isFav, setIsFav] = useState(false)

    useEffect(() => {
      setIsFav(isFavorite(videoId, source))
    }, [videoId, source, isFavorite])

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setIsAnimating(true)
        const newState = toggleFavorite({
          videoId,
          source,
          title,
          poster,
          sourceName,
          type,
          year,
          remarks,
        })
        setIsFav(newState)

        setTimeout(() => setIsAnimating(false), 300)
      },
      [
        videoId,
        source,
        title,
        poster,
        sourceName,
        type,
        year,
        remarks,
        toggleFavorite,
      ],
    )

    const button = (
      <Button
        variant="ghost"
        size={plain ? 'icon-xs' : 'icon'}
        onClick={handleClick}
        aria-label={isFav ? '取消收藏' : '收藏'}
        className={cn(
          !plain &&
            'rounded-full bg-background/95 backdrop-blur-sm border border-border hover:scale-110 active:scale-95 transition-all duration-200 ease-out',
          !plain && isAnimating && 'scale-125',
          className,
        )}
      >
        {isFav ? (
          <span
            style={{
              transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
              filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))',
              display: 'flex',
            }}
          >
            <HeartIcon
              size={size}
              className="text-red-500"
              fill="currentColor"
            />
          </span>
        ) : (
          <HeartIcon
            size={size}
            className="text-muted-foreground hover:text-red-400 transition-colors"
          />
        )}
      </Button>
    )

    if (!showTooltip) return button

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>{isFav ? '取消收藏' : '收藏'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
)

FavoriteButton.displayName = 'FavoriteButton'
