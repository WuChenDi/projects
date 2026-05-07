import { FilmIcon, TrashIcon } from 'lucide-react'
import type { WatchLaterItem as WatchLaterItemType } from '@/lib/types'
import { formatDate } from '@/lib/utils/format-utils'

interface WatchLaterItemProps {
  item: WatchLaterItemType
  onRemove: () => void
  isPremium?: boolean
}

export function WatchLaterItem({
  item,
  onRemove,
  isPremium = false,
}: WatchLaterItemProps) {
  const getVideoUrl = (): string => {
    const params = new URLSearchParams({
      id: item.videoId.toString(),
      source: item.source,
      title: item.title,
    })
    if (isPremium) {
      params.set('premium', '1')
    }
    return `/player?${params.toString()}`
  }

  const handleClick = (event: React.MouseEvent) => {
    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      event.preventDefault()
      window.open(getVideoUrl(), '_blank')
    }
  }

  return (
    <div className="group bg-background/50 rounded-2xl p-3 hover:bg-primary/10 transition-all border border-transparent hover:border-border">
      <a
        href={getVideoUrl()}
        onClick={(e) => {
          e.preventDefault()
          handleClick(e as React.MouseEvent)
          if (!e.ctrlKey && !e.metaKey) {
            window.location.href = getVideoUrl()
          }
        }}
        onAuxClick={(e) => handleClick(e as React.MouseEvent)}
        className="block"
      >
        <div className="flex gap-3">
          <div className="relative w-28 h-16 flex-shrink-0 bg-background/95 rounded-2xl overflow-hidden">
            {item.poster ? (
              <img
                src={item.poster}
                alt={item.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center -z-10">
              <FilmIcon size={32} className="text-muted-foreground opacity-30" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors mb-1">
              {item.title}
            </h3>
            {item.year && (
              <p className="text-xs text-muted-foreground mb-1">{item.year}</p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {item.remarks && <span className="truncate">{item.remarks}</span>}
              <span className="flex-shrink-0">{formatDate(item.addedAt)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 self-start opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemove()
              }}
              className="p-1.5 hover:bg-background/95 rounded-full cursor-pointer"
              aria-label="从稍后观看移除"
            >
              <TrashIcon size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </a>
    </div>
  )
}
