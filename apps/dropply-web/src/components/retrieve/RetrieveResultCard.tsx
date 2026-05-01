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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@cdlab996/ui/components/input-group'
import { cn } from '@cdlab996/ui/lib/utils'
import type { ZipFileEntry } from '@cdlab996/utils'
import {
  copyToClipboard,
  downloadFilesAsZip,
  formatBytes,
} from '@cdlab996/utils'
import {
  CheckCircle,
  Clock,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileText,
  FolderOpen,
  Loader2,
  Package,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { getFileIcon, PocketChestAPI } from '@/lib'
import { decryptFile } from '@/lib/crypto'
import type { RetrievedFile, RetrieveResult } from '@/store/useRetrieveStore'
import { FilePreviewModal, isPreviewable } from './FilePreviewModal'

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
  const [previewFile, setPreviewFile] = useState<RetrievedFile | null>(null)

  const handleDownloadAll = useCallback(async () => {
    setIsDownloadingAll(true)
    setDownloadError(null)
    try {
      const api = new PocketChestAPI()

      const files: ZipFileEntry[] = await Promise.all(
        result.files.map(async (file) => {
          if (file.isText && file.content) {
            return { path: file.filename, data: file.content }
          }
          const blob = await api.downloadFile(file.fileId, result.chestToken)
          const decrypted = await decryptFile(
            blob,
            result.encryptionKey,
            file.filename,
          )
          return { path: file.filename, data: decrypted }
        }),
      )

      await downloadFilesAsZip(files, result.retrievalCode)
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
  const totalSize = result.files.reduce((sum, f) => sum + f.size, 0)

  const handleCopyText = async (content: string, fileId: string) => {
    await copyToClipboard(content)
    setCopiedFileId(fileId)
    setTimeout(() => setCopiedFileId(null), 2000)
  }

  return (
    <>
      {/* Result Card — aligned with ShareResultCard style */}
      <Card
        className={cn(
          'relative p-4 border',
          'bg-linear-to-br from-emerald-50/30 to-teal-50/30 border-emerald-200/30',
          'dark:from-emerald-950/10 dark:to-teal-950/10 dark:border-emerald-800/20',
        )}
      >
        <div className="space-y-3">
          {/* Header: icon + code + close */}
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

          {/* Info block — matches share URL block style */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span>{t('fileCount', { count: fileCount })}</span>
              <span>{formatBytes({ bytes: totalSize })}</span>
            </div>
            {result.expiryDate && (
              <div
                className={cn(
                  'flex items-center gap-1',
                  isExpired && 'text-red-500',
                )}
              >
                <Clock className="size-3" />
                {isExpired
                  ? t('expired')
                  : new Date(result.expiryDate).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Action button */}
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

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground">
            {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      </Card>

      {/* File List Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                <Package className="size-4 text-primary" />
              </div>
              <div>
                <code className="font-mono text-primary text-base">
                  {result.retrievalCode}
                </code>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  {t('fileCount', { count: fileCount })} &middot;{' '}
                  {formatBytes({ bytes: totalSize })}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {/* Text files */}
            {textFiles.map((file) => {
              const displayName = file.filename.endsWith('.txt')
                ? file.filename.slice(0, -4)
                : file.filename
              return (
                <div
                  key={file.fileId}
                  className="rounded-lg border border-border/30 bg-muted/20 overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 p-3 pb-2">
                    <div className="flex items-center justify-center size-8 rounded-md bg-emerald-500/10 shrink-0">
                      <FileText className="size-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes({ bytes: file.size })}
                      </p>
                    </div>
                  </div>
                  {file.content && (
                    <div className="px-3 pb-3">
                      <InputGroup>
                        <InputGroupTextarea
                          value={file.content}
                          readOnly
                          className="min-h-[80px] max-h-32 resize-none font-mono text-xs text-muted-foreground bg-muted/50 break-all"
                        />
                        <InputGroupAddon align="block-end" className="border-t">
                          <InputGroupText className="text-xs text-muted-foreground">
                            {formatBytes({ bytes: file.size })}
                          </InputGroupText>
                          <InputGroupButton
                            size="icon-xs"
                            variant="outline"
                            className="ml-auto text-xs"
                            onClick={() =>
                              handleCopyText(file.content!, file.fileId)
                            }
                            title={
                              copiedFileId === file.fileId
                                ? t('copied')
                                : t('copy')
                            }
                          >
                            {copiedFileId === file.fileId ? (
                              <CheckCircle className="size-3.5" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </InputGroupButton>
                          <InputGroupButton
                            size="icon-xs"
                            variant="outline"
                            disabled={isExpired}
                            onClick={() =>
                              onDownload(
                                file.fileId,
                                result.chestToken,
                                file.filename,
                                result.encryptionKey,
                              )
                            }
                            title={isExpired ? t('expired') : t('download')}
                          >
                            <Download className="size-3.5" />
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Binary files */}
            {binaryFiles.map((file) => {
              const canPreview = isPreviewable(file.filename)
              return (
                <div
                  key={file.fileId}
                  className="rounded-lg border border-border/30 bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center size-8 rounded-md bg-muted/50 shrink-0">
                      {getFileIcon(file.filename, 16)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-all leading-snug">
                        {file.filename}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes({ bytes: file.size })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canPreview && (
                        <Button
                          onClick={() => setPreviewFile(file)}
                          size="icon-sm"
                          variant="outline"
                          disabled={isExpired}
                          title={isExpired ? t('expired') : t('preview')}
                        >
                          <Eye className="size-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() =>
                          onDownload(
                            file.fileId,
                            result.chestToken,
                            file.filename,
                            result.encryptionKey,
                          )
                        }
                        size="icon-sm"
                        variant="outline"
                        disabled={isExpired}
                        title={isExpired ? t('expired') : t('download')}
                      >
                        <Download className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {downloadError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/30 p-2 rounded-lg">
              {downloadError}
            </p>
          )}

          <DialogFooter className="mt-2">
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

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          chestToken={result.chestToken}
          encryptionKey={result.encryptionKey}
          onClose={() => setPreviewFile(null)}
          onDownload={() => {
            setPreviewFile(null)
            onDownload(
              previewFile.fileId,
              result.chestToken,
              previewFile.filename,
              result.encryptionKey,
            )
          }}
        />
      )}
    </>
  )
}
