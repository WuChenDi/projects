'use client'

import { IKEmpty } from '@cdlab996/ui/IK'
import { CloudUpload } from 'lucide-react'
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
      <IKEmpty
        icon={CloudUpload}
        className="h-full min-h-[400px]"
        title="No images yet"
        description="Upload images to get started"
      />
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
