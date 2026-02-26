'use client'

import { CloudUpload } from 'lucide-react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cdlab996/ui/components/empty'
import { downloadImage } from '@/lib'
import type { ImageFile } from '@/types'
import { ImageItem } from './ImageItem'

interface RightPanelProps {
  images: ImageFile[]
  handleRemoveImage: (id: string) => void
  handleRetryImage: (id: string) => void
  handleCompareImage: (image: ImageFile) => void
}

export const RightPanel = ({
  images,
  handleRemoveImage,
  handleRetryImage,
  handleCompareImage,
}: RightPanelProps) => {
  if (images.length === 0) {
    return (
      <Empty className="h-full min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia>
            <CloudUpload className="size-10" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">No images yet</EmptyTitle>
          <EmptyDescription>Upload images to get started</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 p-0.5">
      {images.map((image) => (
        <ImageItem
          key={image.id}
          image={image}
          onRemove={handleRemoveImage}
          onDownload={downloadImage}
          onRetry={handleRetryImage}
          onCompare={handleCompareImage}
        />
      ))}
    </div>
  )
}
