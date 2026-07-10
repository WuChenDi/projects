export interface BgImageFile {
  id: string
  /** Source file. Undefined after store rehydrate (originals are not persisted). */
  file?: File
  fileName: string
  fileType: string
  preview?: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
  originalSize: number
  processedBlob?: Blob
  processedUrl?: string
}

export type RemovalModel =
  | 'briaai/RMBG-1.4'
  | 'wuchendi/MODNet'
  | 'briaai/RMBG-2.0'

export type ModelStatus = 'ready' | 'unavailable' | 'loading'

export interface BgError {
  message: string
}
