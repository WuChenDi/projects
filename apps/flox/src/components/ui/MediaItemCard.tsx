import { FilmIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type React from 'react'

interface MediaItemCardProps {
  href: string
  poster?: string
  title: string
  subtitle?: string
  metaLeft?: React.ReactNode
  metaRight?: string
  /** 0–100, renders a progress bar at the bottom of the poster when provided */
  progress?: number
  actions?: React.ReactNode
}

export function MediaItemCard({
  href,
  poster,
  title,
  subtitle,
  metaLeft,
  metaRight,
  progress,
  actions,
}: MediaItemCardProps) {
  return (
    <div className="group bg-background/50 rounded-xl border border-transparent transition-all hover:border-primary/60 hover:shadow-xl">
      <Link
        href={href}
        prefetch={false}
        className="block p-3 transition-transform duration-200 active:scale-[0.985]"
      >
        <div className="flex gap-3">
          {/* Poster */}
          <div className="relative w-28 h-16 flex-shrink-0 bg-background/95 rounded-md overflow-hidden">
            {poster ? (
              <Image
                src={poster}
                alt={title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                unoptimized
                referrerPolicy="no-referrer"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center -z-10">
              <FilmIcon
                size={32}
                className="text-muted-foreground opacity-30"
              />
            </div>
            {progress !== undefined && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors mb-1">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mb-1">{subtitle}</p>
            )}
            {(metaLeft || metaRight) && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{metaLeft}</span>
                {metaRight && (
                  <span className="flex-shrink-0 ml-2">{metaRight}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex flex-col gap-1 self-start">{actions}</div>
          )}
        </div>
      </Link>
    </div>
  )
}
