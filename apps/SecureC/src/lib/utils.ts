import { ModeEnum } from '@/types'

export function getFileExtension(filename: string) {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()! : 'txt'
}

export function getFilenameWithoutExtension(filename: string) {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.slice(0, -1).join('.') : filename
}

// Clamp progress value between 0 and 100
export const clampProgress = (progress: number): number =>
  Math.min(Math.max(progress, 0), 100)

// Generate download filename
export const generateDownloadFilename = (
  mode: keyof typeof ModeEnum,
  isTextMode: boolean,
  originalFilename?: string,
  originalExtension?: string,
): string => {
  const timestamp = Date.now()

  if (isTextMode) {
    return mode === ModeEnum.ENCRYPT
      ? `encrypted_text_${timestamp}.enc`
      : `text_${timestamp}.txt`
  }

  if (mode === ModeEnum.ENCRYPT && originalFilename) {
    const nameWithoutExt = getFilenameWithoutExtension(originalFilename)
    return `${nameWithoutExt}_${timestamp}.enc`
  }

  if (mode === ModeEnum.DECRYPT && originalExtension) {
    return `${timestamp}.${originalExtension}`
  }

  return `file_${timestamp}`
}
