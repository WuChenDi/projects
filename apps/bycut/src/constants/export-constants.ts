import type { ExportOptions } from '@/types/export'

export const DEFAULT_EXPORT_OPTIONS = {
  format: 'mp4',
  quality: 'high',
  includeAudio: true,
} satisfies ExportOptions

export const EXPORT_MIME_TYPES = {
  webm: 'video/webm',
  mp4: 'video/mp4',
} as const

export const AUDIO_EXPORT_MIME_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
} as const
