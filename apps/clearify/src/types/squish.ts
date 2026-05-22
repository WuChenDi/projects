export interface ImageFile {
  id: string
  /** Source file. Undefined after store rehydrate (originals are not persisted). */
  file?: File
  fileName: string
  fileType: string
  preview?: string
  status: 'pending' | 'queued' | 'processing' | 'complete' | 'error'
  error?: string
  originalSize: number
  compressedSize?: number
  outputType?: OutputType
  blob?: Blob
}

export type OutputType = 'avif' | 'jpeg' | 'jxl' | 'png' | 'webp'

export interface FormatQualitySettings {
  avif: number
  jpeg: number
  jxl: number
  webp: number
}

export interface CompressionOptions {
  quality: number
}
