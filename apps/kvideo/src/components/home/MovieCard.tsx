'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Card } from '@cdlab996/ui/components/card'
import { CalendarIcon, FilmIcon, StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { memo, useState } from 'react'

interface DoubanMovie {
  id: string
  title: string
  cover: string
  rate: string
  url: string
  year?: string // 可选字段，根据你的数据补充
  type_name?: string // 可选：类型
}

interface MovieCardProps {
  movie: DoubanMovie
  onMovieClick: (movie: DoubanMovie) => void
}

export const MovieCard = memo(function MovieCard({
  movie,
  onMovieClick,
}: MovieCardProps) {
  const [imageError, setImageError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)

  // 处理点击（保留你原来的 modifier keys 逻辑）
  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    e.preventDefault()
    onMovieClick(movie)
  }

  return (
    <div className="group relative">
      <Link
        href={movie.url || `/?q=${encodeURIComponent(movie.title)}`}
        onClick={handleClick}
        className="block h-full transition-transform duration-200 active:scale-[0.985] hover:-translate-y-0.5"
      >
        <Card className="h-full overflow-hidden backdrop-blur-sm border border-border hover:border-primary/60 hover:shadow-xl transition-all p-0">
          <div className="relative aspect-3/2 bg-muted overflow-hidden">
            {!imageError && movie.cover ? (
              <Image
                src={movie.cover}
                alt={movie.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                loading="eager"
                unoptimized
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            ) : null}

            {(imageError || !movie.cover) && !fallbackError ? (
              <Image
                src="/placeholder-poster.svg"
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                unoptimized
                onError={() => setFallbackError(true)}
              />
            ) : imageError || fallbackError || !movie.cover ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <FilmIcon size={64} className="text-muted-foreground/40" />
              </div>
            ) : null}

            {movie.rate && parseFloat(movie.rate) > 0 && (
              <Badge className="absolute top-3 right-3 z-20 bg-black/80 text-white gap-1 shadow-sm">
                <StarIcon size={11} className="text-yellow-400 fill-yellow-400" />
                {movie.rate}
              </Badge>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                {movie.type_name && (
                  <div className="mb-2">
                    <span className="inline-block px-2 py-0.5 text-xs bg-white/10 text-white border border-white/30 rounded">
                      {movie.type_name}
                    </span>
                  </div>
                )}

                {movie.year && (
                  <div className="flex items-center gap-1.5 text-white/90 text-xs">
                    <CalendarIcon size={13} />
                    <span>{movie.year}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pb-3.5 px-3.5 flex flex-col flex-1">
            <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground mb-1.5">
              {movie.title}
            </h4>
          </div>
        </Card>
      </Link>
    </div>
  )
})

MovieCard.displayName = 'MovieCard'
