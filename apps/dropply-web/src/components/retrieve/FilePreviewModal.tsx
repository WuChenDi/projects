'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { formatBytes } from '@cdlab996/utils'
import { Download, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PocketChestAPI } from '@/lib'
import { decryptFile } from '@/lib/crypto'
import { getFileIcon } from '@/lib'
import type { RetrievedFile } from '@/store/useRetrieveStore'

type PreviewType = 'image' | 'video' | 'audio' | 'pdf' | 'unsupported'

const IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif',
])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'])

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
}

function getPreviewType(filename: string): PreviewType {
  const ext = getExtension(filename)
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  return 'unsupported'
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
  avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg',
  mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac',
  flac: 'audio/flac', m4a: 'audio/mp4', wma: 'audio/x-ms-wma', pdf: 'application/pdf',
}

function getMimeFromFilename(filename: string): string {
  return EXT_TO_MIME[getExtension(filename)] || 'application/octet-stream'
}

export function isPreviewable(filename: string): boolean {
  return getPreviewType(filename) !== 'unsupported'
}

interface FilePreviewModalProps {
  file: RetrievedFile
  chestToken: string
  encryptionKey: string
  onClose: () => void
  onDownload: () => void
}

export function FilePreviewModal({
  file,
  chestToken,
  encryptionKey,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  const t = useTranslations('retrieve')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const previewType = getPreviewType(file.filename)
  const resolvedMime = getMimeFromFilename(file.filename)

  const loadPreview = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const api = new PocketChestAPI()
      const blob = await api.downloadFile(file.fileId, chestToken)
      const decrypted = await decryptFile(blob, encryptionKey, file.filename)
      const typed = new Blob([decrypted], { type: resolvedMime })
      const url = URL.createObjectURL(typed)
      blobUrlRef.current = url
      setBlobUrl(url)
    } catch {
      setError(t('previewFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [file, chestToken, encryptionKey, t])

  useEffect(() => {
    loadPreview()
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [loadPreview])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted/50 shrink-0">
              {getFileIcon(file.filename, 20)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium break-all leading-snug">
                {file.filename}
              </p>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {formatBytes({ bytes: file.size })}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('previewLoading')}
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button variant="outline" size="sm" onClick={loadPreview}>
                {t('previewRetry')}
              </Button>
            </div>
          )}

          {blobUrl && !isLoading && !error && (
            <>
              {previewType === 'image' && (
                <img
                  src={blobUrl}
                  alt={file.filename}
                  className="max-w-full max-h-[65vh] rounded-lg object-contain"
                />
              )}

              {previewType === 'video' && (
                <video
                  src={blobUrl}
                  controls
                  className="max-w-full max-h-[65vh] rounded-lg"
                >
                  <track kind="captions" />
                </video>
              )}

              {previewType === 'audio' && (
                <div className="w-full px-4 py-8">
                  <audio src={blobUrl} controls className="w-full">
                    <track kind="captions" />
                  </audio>
                </div>
              )}

              {previewType === 'pdf' && (
                <iframe
                  src={blobUrl}
                  title={file.filename}
                  className="w-full h-[65vh] rounded-lg border"
                />
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="size-4" />
            {t('download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
