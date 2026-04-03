'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Card } from '@cdlab996/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { cn } from '@cdlab996/ui/lib/utils'
import { copyToClipboard, formatBytes } from '@cdlab996/utils'
import JSZip from 'jszip'
import {
  CheckCircle,
  Clock,
  Copy,
  Download,
  File,
  FileArchive,
  FileText,
  FolderOpen,
  Loader2,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { PocketChestAPI } from '@/lib'
import { decryptFile } from '@/lib/crypto'
import type { RetrieveResult } from '@/store/useRetrieveStore'

interface RetrieveResultCardProps {
  result: RetrieveResult
  onDownload: (
    fileId: string,
    chestToken: string,
    filename: string,
    encryptionKey: string,
  ) => void
  onRemove: (id: string) => void
}

export function RetrieveResultCard({
  result,
  onDownload,
  onRemove,
}: RetrieveResultCardProps) {
  const t = useTranslations('retrieve')
  const [open, setOpen] = useState(false)
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownloadAll = useCallback(async () => {
    setIsDownloadingAll(true)
    setDownloadError(null)
    try {
      const api = new PocketChestAPI()
      const zip = new JSZip()

      await Promise.all(
        result.files.map(async (file) => {
          if (file.isText && file.content) {
            zip.file(file.filename, file.content)
          } else {
            const blob = await api.downloadFile(file.fileId, result.chestToken)
            const decrypted = await decryptFile(
              blob,
              result.encryptionKey,
              file.filename,
            )
            zip.file(file.filename, decrypted)
          }
        }),
      )

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      api.triggerDownload(zipBlob, `${result.retrievalCode}.zip`)
    } catch {
      setDownloadError(t('downloadAllFailed'))
    } finally {
      setIsDownloadingAll(false)
    }
  }, [result, t])

  const isExpired =
    !!result.expiryDate && new Date(result.expiryDate) < new Date()
  const fileCount = result.files.length
  const textFiles = result.files.filter((f) => f.isText)
  const binaryFiles = result.files.filter((f) => !f.isText)

  const handleCopyText = async (content: string, fileId: string) => {
    await copyToClipboard(content)
    setCopiedFileId(fileId)
    setTimeout(() => setCopiedFileId(null), 2000)
  }

  return (
    <>
      <Card
        className={cn(
          'relative p-4 border',
          'bg-gradient-to-br from-emerald-50/30 to-teal-50/30 border-emerald-200/30',
          'dark:from-emerald-950/10 dark:to-teal-950/10 dark:border-emerald-800/20',
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="size-4 text-primary shrink-0" />
              <code className="font-mono font-bold text-primary text-lg">
                {result.retrievalCode}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
              onClick={() => onRemove(result.id)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
            <span className="flex items-center gap-1">
              <File className="size-4" />
              {t('fileCount', { count: fileCount })}
            </span>
            {result.expiryDate && (
              <span
                className={cn(
                  'flex items-center gap-1',
                  isExpired && 'text-red-500',
                )}
              >
                <Clock className="size-4" />
                {isExpired
                  ? t('expired')
                  : new Date(result.expiryDate).toLocaleDateString()}
              </span>
            )}
          </div>

          <Button
            onClick={() => setOpen(true)}
            size="sm"
            variant="outline"
            className="w-full text-xs"
            disabled={isExpired}
          >
            <FolderOpen className="size-4" />
            {t('viewFiles')}
          </Button>

          <p className="text-xs text-muted-foreground">
            {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="size-5 text-primary" />
              <code className="font-mono text-primary">
                {result.retrievalCode}
              </code>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {textFiles.map((file) => {
              const displayName = file.filename.endsWith('.txt')
                ? file.filename.slice(0, -4)
                : file.filename
              return (
                <div
                  key={file.fileId}
                  className="p-3 rounded-lg border border-border/30 bg-muted/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="size-4 text-emerald-500" />
                    <span className="text-sm font-medium truncate flex-1">
                      {displayName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes({ bytes: file.size })}
                    </span>
                  </div>
                  {file.content && (
                    <>
                      <div className="bg-muted/50 rounded-md p-2 max-h-32 overflow-y-auto border border-border/30 mb-2">
                        <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                          {file.content}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleCopyText(file.content!, file.fileId)
                          }
                          size="sm"
                          variant="outline"
                          className={cn(
                            'flex-1 text-xs',
                            copiedFileId === file.fileId &&
                              'text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30',
                          )}
                        >
                          {copiedFileId === file.fileId ? (
                            <>
                              <CheckCircle className="size-4" />
                              {t('copied')}
                            </>
                          ) : (
                            <>
                              <Copy className="size-4" />
                              {t('copy')}
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() =>
                            onDownload(
                              file.fileId,
                              result.chestToken,
                              file.filename,
                              result.encryptionKey,
                            )
                          }
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={isExpired}
                        >
                          <Download className="size-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            {binaryFiles.map((file) => (
              <div
                key={file.fileId}
                className="p-3 rounded-lg border border-border/30 bg-muted/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="size-4 text-purple-500" />
                  <span className="text-sm font-medium truncate">
                    {file.filename}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatBytes({ bytes: file.size })}
                  </span>
                </div>
                <Button
                  onClick={() =>
                    onDownload(
                      file.fileId,
                      result.chestToken,
                      file.filename,
                      result.encryptionKey,
                    )
                  }
                  size="sm"
                  variant="outline"
                  className="text-xs ml-2 shrink-0"
                  disabled={isExpired}
                >
                  <Download className="size-4" />
                  {t('download')}
                </Button>
              </div>
            ))}
          </div>

          {downloadError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/30 p-2 rounded-lg">
              {downloadError}
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button
              onClick={handleDownloadAll}
              disabled={isDownloadingAll || isExpired}
              className="w-full"
            >
              {isDownloadingAll ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('downloadingAll')}
                </>
              ) : (
                <>
                  <FileArchive className="size-4" />
                  {t('downloadAll')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
