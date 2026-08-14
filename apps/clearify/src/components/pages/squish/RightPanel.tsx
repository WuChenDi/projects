'use client'

import { IKEmpty } from '@cdlab/ui/IK'
import { downloadFile } from '@cdlab/utils'
import { CloudUpload } from 'lucide-react'
import { stripExtension } from '@/lib'
import type { ImageFile } from '@/types'
import { ImageItem } from './ImageItem'

interface RightPanelProps {
  images: ImageFile[]
  handleRemoveImage: (id: string) => void
  handleRetryImage: (id: string) => void
  handleCompareImage: (image: ImageFile) => void
  handleRenameImage: (id: string, fileName: string) => void
}

export const RightPanel = ({
  images,
  handleRemoveImage,
  handleRetryImage,
  handleCompareImage,
  handleRenameImage,
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
          onDownload={(image) => {
            if (!image.blob || !image.outputType) return
            downloadFile({
              data: image.blob,
              filename: `${stripExtension(image.fileName)}.${image.outputType}`,
            })
          }}
          onRetry={handleRetryImage}
          onCompare={handleCompareImage}
          onRename={handleRenameImage}
        />
      ))}
    </div>
  )
}
