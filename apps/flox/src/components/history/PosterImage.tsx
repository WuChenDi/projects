/**
 * PosterImage - Video poster with fallback handling
 */

import { FilmIcon } from 'lucide-react'

interface PosterImageProps {
  poster?: string
  title: string
  progress: number
}

export function PosterImage({ poster, title, progress }: PosterImageProps) {
  return (
    <div className="relative w-28 h-16 flex-shrink-0 bg-[var(--glass-bg)] rounded-[var(--radius-2xl)] overflow-hidden">
      {poster ? (
        <img
          src={poster}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              const fallback = document.createElement('div')
              fallback.className =
                'w-full h-full flex items-center justify-center'
              fallback.innerHTML =
                '<svg class="text-[var(--text-color-secondary)] opacity-30" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>'
              parent.appendChild(fallback)
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <FilmIcon
            size={32}
            className="text-[var(--text-color-secondary)] opacity-30"
          />
        </div>
      )}
      {/* Progress overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
        <div
          className="h-full bg-[var(--accent-color)]"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  )
}
