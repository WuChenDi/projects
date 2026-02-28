'use client'

import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { formatFileSize } from '@cdlab996/utils'
import { ArrowRight, Download, Eye, RotateCcw, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback } from 'react'
import { IKAssetFailed } from '@/components/IK/IKAssetFailed'
import { IKAssetLoading } from '@/components/IK/IKAssetLoading'
import { IKAssetStatusRenderer } from '@/components/IK/IKAssetStatusRenderer'
import type { ImageFile } from '@/types'

interface ImageItemProps {
  image: ImageFile
  onRemove: (id: string) => void
  onDownload: (image: ImageFile) => void
  onRetry: (id: string) => void
  onCompare: (image: ImageFile) => void
}

export const ImageItem = ({
  image,
  onRemove,
  onDownload,
  onRetry,
  onCompare,
}: ImageItemProps) => {
  const renderLoading = useCallback(
    () => (
      <>
        <div className="relative flex items-center justify-center rounded-sm shadow-none shrink-0 aspect-square overflow-hidden">
          <IKAssetLoading />
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="size-6 bg-black/40 backdrop-blur-[2px]"
              onClick={() => onRemove(image.id)}
              title="Remove"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </>
    ),
    [image.id, onRemove],
  )

  const renderSuccess = useCallback(
    () => (
      <>
        <div className="relative flex items-center justify-center rounded-sm shadow-none shrink-0 aspect-square overflow-hidden group cursor-pointer">
          <Link
            href={image.preview || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full"
          >
            <Image
              src={image.preview || ''}
              alt={image.file.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              unoptimized
            />
          </Link>
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            {image.blob && (
              <Button
                variant="secondary"
                size="icon"
                className="size-6 bg-black/40 backdrop-blur-[2px]"
                onClick={() => onCompare(image)}
              >
                <Eye className="size-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="icon"
              className="size-6 bg-black/40 backdrop-blur-[2px]"
              onClick={() => onDownload(image)}
              title="Download"
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="size-6 bg-black/40 backdrop-blur-[2px]"
              onClick={() => onRemove(image.id)}
              title="Remove"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="absolute inset-x-0 bottom-0 w-full flex items-center justify-center p-2 text-xs text-white rounded border-t border-white/10 bg-black/40 backdrop-blur-[2px]">
            <p className="truncate">{image.file.name}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground/80">
            <span className="tabular-nums">
              {formatFileSize(image.originalSize)}
            </span>
            {image.compressedSize && (
              <>
                <ArrowRight className="inline w-3 h-3 mx-1 text-muted-foreground/60" />
                <span className="tabular-nums">
                  {formatFileSize(image.compressedSize)}
                </span>
                <span className="ml-1 text-green-400 font-medium">
                  (
                  {Math.round(
                    ((image.originalSize - image.compressedSize) /
                      image.originalSize) *
                      100,
                  )}
                  %)
                </span>
              </>
            )}
          </div>
        </div>
      </>
    ),
    [image, onCompare, onDownload, onRemove],
  )

  const renderFailure = useCallback(
    () => (
      <>
        <div className="relative flex items-center justify-center rounded-sm shadow-none shrink-0 aspect-square overflow-hidden">
          <IKAssetFailed error={image.error} />
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="size-6 bg-black/40 backdrop-blur-[2px]"
              onClick={() => onRetry(image.id)}
              title="Retry"
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="size-6 bg-black/40 backdrop-blur-[2px]"
              onClick={() => onRemove(image.id)}
              title="Remove"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </>
    ),
    [image.error, image.id, onRemove, onRetry],
  )

  return (
    <div
      className={cn(
        'rounded-md bg-linear-to-r from-[#1a1b2e]/50 to-[#2a2b3e]/50 backdrop-blur-lg',
        'border border-border/30 shadow-lg p-3',
        'transition-shadow duration-200 hover:ring-2 hover:ring-primary',
      )}
    >
      <IKAssetStatusRenderer
        status={image.status}
        renderLoading={renderLoading}
        renderSuccess={renderSuccess}
        renderFailure={renderFailure}
      />
    </div>
  )
}
