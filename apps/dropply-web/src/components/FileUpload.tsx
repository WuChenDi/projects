'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { cn } from '@cdlab/ui/lib/utils'
import { formatBytes } from '@cdlab/utils'
import { HardDrive, Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { getFileIcon } from '@/lib'

interface FileUploadProps {
  onFilesChange: (files: File[]) => void
  files: File[]
  maxFileSize?: number
}

function FilePreviewModal({
  file,
  onClose,
}: {
  file: File
  onClose: () => void
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{file.name}</DialogTitle>
        </DialogHeader>

        <div className="overflow-auto max-h-[calc(80vh-56px)]">
          {imageUrl ? (
            // biome-ignore lint/performance/noImgElement: blob URL preview, next/image cannot optimize
            <img
              src={imageUrl}
              alt={file.name}
              className="max-w-full max-h-[60vh] rounded-lg object-contain mx-auto"
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-muted/50 mx-auto">
                {getFileIcon(file.name)}
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.type} &middot; {formatBytes({ bytes: file.size })}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function FileUpload({
  onFilesChange,
  files,
  maxFileSize,
}: FileUploadProps) {
  const t = useTranslations('fileUpload')
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setSizeError(null)
      if (maxFileSize) {
        const rejected = acceptedFiles.filter((f) => f.size > maxFileSize)
        const accepted = acceptedFiles.filter((f) => f.size <= maxFileSize)
        if (rejected.length > 0) {
          const file = rejected[0]
          setSizeError(
            t('fileTooLarge', {
              name: file.name,
              size: formatBytes({ bytes: file.size }),
              limit: formatBytes({ bytes: maxFileSize }),
            }),
          )
        }
        const newFiles = [...files, ...accepted]
        onFilesChange(newFiles)
      } else {
        const newFiles = [...files, ...acceptedFiles]
        onFilesChange(newFiles)
      }
    },
    [files, onFilesChange, maxFileSize, t],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: false,
  })

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  return (
    <>
      <div className="w-full space-y-4">
        <div
          {...getRootProps()}
          className={cn(
            'group relative overflow-hidden rounded-lg border border-dashed transition-all duration-300 cursor-pointer',
            cn(
              'border-gray-300 dark:border-gray-600',
              'hover:border-blue-400 dark:hover:border-blue-500',
            ),
            isDragActive &&
              'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/30',
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-3 p-8">
            <Upload
              className={cn(
                'size-8 transition-colors duration-300',
                isDragActive
                  ? 'text-blue-500'
                  : 'text-gray-400 group-hover:text-blue-500',
              )}
            />
            <span
              className={cn(
                'text-sm text-center font-medium transition-colors duration-300',
                isDragActive
                  ? 'text-blue-600'
                  : 'text-gray-500 group-hover:text-blue-600',
              )}
            >
              {isDragActive ? t('dropHere') : t('clickToSelect')}
            </span>
            {maxFileSize && (
              <span className="text-xs text-muted-foreground">
                {t('maxFileSize', {
                  limit: formatBytes({ bytes: maxFileSize }),
                })}
              </span>
            )}
          </div>
        </div>

        {sizeError && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/30 p-2 rounded-lg">
            {sizeError}
          </p>
        )}

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="size-4 text-muted-foreground" />
              <h4 className="font-semibold text-foreground">
                {t('selectedFiles')} ({files.length})
              </h4>
            </div>

            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                  key={index}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg cursor-pointer',
                    'border border-border/40 bg-blue-50/50 dark:bg-blue-900/30',
                    'transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/40',
                  )}
                  onClick={() => setPreviewFile(file)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes({ bytes: file.size })}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    variant="ghost"
                    size="icon-sm"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  )
}
