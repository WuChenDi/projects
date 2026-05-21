export interface ImageProps {
  id: number
  asset_id: string
  height: string | number
  width: string | number
  public_id: string
  format: string
  blurDataUrl?: string
}

export interface SharedModalProps {
  index: number
  images?: ImageProps[]
  currentPhoto?: ImageProps
  changePhotoId: (newVal: number) => void
  closeModal: () => void
  navigation: boolean
  direction?: number
}
