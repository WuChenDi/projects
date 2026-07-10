'use client'

import {
  Dialog,
  DialogOverlay,
  DialogPortal,
} from '@cdlab/ui/components/dialog'
import { useRouter } from 'next/navigation'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useState } from 'react'
import useKeypress from 'react-use-keypress'
import type { ImageProps } from '@/utils/types'
import SharedModal from './SharedModal'

export default function Modal({
  images,
  photoAssetId,
  onClose,
}: {
  images: ImageProps[]
  photoAssetId: string
  onClose?: () => void
}) {
  const router = useRouter()
  const initialIndex = Math.max(
    0,
    images.findIndex((img) => img.asset_id === photoAssetId),
  )
  const [direction, setDirection] = useState(0)
  const [curIndex, setCurIndex] = useState(initialIndex)

  function handleClose() {
    router.push('/', { scroll: false })
    onClose?.()
  }

  function changePhotoId(newVal: number) {
    setDirection(newVal > curIndex ? 1 : -1)
    setCurIndex(newVal)
    const nextAssetId = images[newVal]?.asset_id
    if (nextAssetId) {
      window.history.replaceState(null, '', `/?photoId=${nextAssetId}`)
    }
  }

  useKeypress('ArrowRight', () => {
    if (curIndex + 1 < images.length) {
      changePhotoId(curIndex + 1)
    }
  })

  useKeypress('ArrowLeft', () => {
    if (curIndex > 0) {
      changePhotoId(curIndex - 1)
    }
  })

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogPortal>
        <DialogOverlay className="z-30 bg-black/70 backdrop-blur-2xl supports-backdrop-filter:backdrop-blur-2xl" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-40 flex items-center justify-center outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            Photo viewer
          </DialogPrimitive.Title>
          <SharedModal
            index={curIndex}
            direction={direction}
            images={images}
            changePhotoId={changePhotoId}
            closeModal={handleClose}
            navigation={true}
          />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
