'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { formatFileSize } from '@cdlab996/utils'
import { FolderOpen, HardDrive, Upload, X } from 'lucide-react'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { getFileIcon } from '@/lib'

interface FileUploadProps {
  onFilesChange: (files: File[]) => void
  files: File[]
}

export function FileUpload({ onFilesChange, files }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles]
      onFilesChange(newFiles)
    },
    [files, onFilesChange],
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
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 group',
          'border-border/40',
          'hover:border-blue-500/80 hover:bg-blue-500/10',
          isDragActive && 'border-blue-500/80 bg-blue-500/10 scale-[1.02]',
        )}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div
            className={cn(
              'mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300',
              'bg-muted/50 group-hover:bg-blue-500/20 group-hover:scale-110',
              isDragActive && 'bg-blue-500/20 scale-110',
            )}
          >
            {isDragActive ? (
              <Upload size={24} className="text-blue-500" />
            ) : (
              <FolderOpen
                size={24}
                className="text-muted-foreground group-hover:text-blue-400 transition-colors duration-300"
              />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-foreground mb-1">
              {isDragActive
                ? 'Drop files here'
                : 'Drop files here or click to browse'}
            </p>
            <p className="text-sm text-muted-foreground">
              Select multiple files to share
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-muted-foreground" />
            <h4 className="font-semibold text-foreground">
              Selected Files ({files.length})
            </h4>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                key={index}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  'border border-border/30 bg-background/30 backdrop-blur-sm',
                  'transition-all duration-200 hover:bg-background/50',
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    FILE
                  </Badge>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 w-8 p-0 text-muted-foreground',
                      'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
                      'transition-colors duration-200',
                    )}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
