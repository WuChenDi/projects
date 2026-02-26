export interface BgImageFile {
  id: string
  file: File
  preview?: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
  originalSize: number
  processedBlob?: Blob
  processedUrl?: string
}

export type RemovalModel = 'briaai/RMBG-1.4' | 'wuchendi/MODNet' | 'briaai/RMBG-2.0'

export type ModelStatus = 'ready' | 'unavailable' | 'loading'

export interface BgError {
  message: string
}
