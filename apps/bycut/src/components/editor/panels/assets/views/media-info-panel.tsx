'use client'

import { formatBytes } from '@cdlab/utils'
import {
  Clock,
  FileType,
  Film,
  HardDrive,
  Image as ImageIcon,
  Maximize2,
  Music,
  Video,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { MediaAsset } from '@/types/assets'

interface MediaInfoPanelProps {
  media: MediaAsset
  onClose: () => void
}

export function MediaInfoPanel({ media, onClose }: MediaInfoPanelProps) {
  const t = useTranslations()

  const typeIcon =
    media.type === 'video' ? (
      <Video className="size-3.5 text-primary" />
    ) : media.type === 'audio' ? (
      <Music className="size-3.5 text-green-500" />
    ) : (
      <ImageIcon className="size-3.5 text-blue-500" />
    )

  const typeLabel =
    media.type === 'video'
      ? t('common.video')
      : media.type === 'audio'
        ? t('common.audio')
        : t('common.image')

  const rows: Array<{ icon: React.ReactNode; label: string; value: string }> =
    []

  // Type
  const mimeType = media.file.type
  const ext = mimeType ? mimeType.split('/')[1] : ''
  rows.push({
    icon: <FileType className="size-3" />,
    label: t('common.type'),
    value: ext ? `${typeLabel} (${ext})` : typeLabel,
  })

  // Duration (video/audio only)
  if (
    (media.type === 'video' || media.type === 'audio') &&
    media.duration &&
    media.duration > 0
  ) {
    const min = Math.floor(media.duration / 60)
    const sec = Math.floor(media.duration % 60)
    rows.push({
      icon: <Clock className="size-3" />,
      label: t('common.duration'),
      value: `${min}:${sec.toString().padStart(2, '0')}`,
    })
  }

  // Dimensions (video/image only)
  if (
    (media.type === 'video' || media.type === 'image') &&
    media.width &&
    media.width > 0 &&
    media.height &&
    media.height > 0
  ) {
    rows.push({
      icon: <Maximize2 className="size-3" />,
      label: t('media.dimensions'),
      value: `${media.width} × ${media.height}`,
    })
  }

  // Codec (video/audio)
  if (media.codec) {
    let codecStr = media.codec.toUpperCase()
    if (media.audioCodec) codecStr += ` / ${media.audioCodec.toUpperCase()}`
    rows.push({
      icon: <Film className="size-3" />,
      label: t('media.codec'),
      value: codecStr,
    })
  }

  // File size
  rows.push({
    icon: <HardDrive className="size-3" />,
    label: t('media.fileSize'),
    value: formatBytes({ bytes: media.file.size }),
  })

  // FPS (video only)
  if (media.type === 'video' && media.fps && media.fps > 0) {
    rows.push({
      icon: <Film className="size-3" />,
      label: t('media.frameRate'),
      value: `${media.fps} fps`,
    })
  }

  return (
    <div className="border-t shrink-0 animate-in slide-in-from-bottom-4 duration-300 ease-out">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {typeIcon}
          <span className="text-[11px] font-medium text-foreground truncate">
            {media.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={t('common.close')}
        >
          <X className="size-3" />
        </button>
      </div>

      {/* Info rows */}
      <div className="p-3 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground shrink-0">{row.icon}</span>
            <span className="text-muted-foreground w-16 shrink-0">
              {row.label}
            </span>
            <span className="text-foreground truncate">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
