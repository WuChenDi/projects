'use client'

import { X } from 'lucide-react'
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from 'react-compare-slider'

import { Button } from '@cdlab996/ui/components/button'
import { formatFileSize } from '@/lib'
import type { ImageFile } from '@/types'

interface ImageComparisonModalProps {
  image: ImageFile
  isOpen: boolean
  onClose: () => void
}

export const ImageComparisonModal = ({
  image,
  isOpen,
  onClose,
}: ImageComparisonModalProps) => {
  if (!isOpen || !image.file || !image.blob) return null

  const originalImageUrl = URL.createObjectURL(image.file)
  const compressedImageUrl = URL.createObjectURL(image.blob)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-card/95 backdrop-blur-lg rounded-xl border border-border/50 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Image Comparison
            </h3>
            <p className="text-sm text-muted-foreground">{image.file.name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-foreground/70 hover:text-foreground hover:bg-background/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4">
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Original ({formatFileSize(image.originalSize)})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>
                Compressed ({formatFileSize(image.compressedSize || 0)})
                {image.compressedSize && (
                  <span className="ml-1 text-green-400 font-medium">
                    (-
                    {Math.round(
                      ((image.originalSize - image.compressedSize) /
                        image.originalSize) *
                        100,
                    )}
                    %)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="relative aspect-video w-full max-h-[60vh] overflow-hidden rounded-lg bg-background border border-border/30">
            <ReactCompareSlider
              itemOne={
                <ReactCompareSliderImage
                  src={originalImageUrl}
                  alt="Original image"
                  style={{ objectFit: 'contain' }}
                />
              }
              itemTwo={
                <ReactCompareSliderImage
                  src={compressedImageUrl}
                  alt="Compressed image"
                  style={{ objectFit: 'contain' }}
                />
              }
              position={50}
              style={{ height: '100%' }}
            />
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Drag the slider to compare original (left) vs compressed (right)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
