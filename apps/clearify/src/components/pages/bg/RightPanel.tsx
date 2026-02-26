'use client'

import type { BgImageFile } from '@/types'
import { Images } from './Images'

interface RightPanelProps {
  images: BgImageFile[]
  onDelete: (id: string) => void
}

export const RightPanel = ({ images, onDelete }: RightPanelProps) => {
  return <Images images={images} onDelete={onDelete} />
}
