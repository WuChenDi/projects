'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Progress } from '@cdlab996/ui/components/progress'
import { cn } from '@cdlab996/ui/lib/utils'
import { formatFileSize } from '@cdlab996/utils'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  File,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import type { FileUploadProgress } from '@/types'

interface UploadProgressProps {
  files: File[]
  textItems: { content: string; filename?: string }[]
  isUploading: boolean
  progress: {
    percentage: number
    loaded: number
    total: number
  }
  fileProgress?: FileUploadProgress[]
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
  onRetry: () => void
  onCancel?: () => void
}

export function UploadProgress({
  files,
  textItems,
  isUploading,
  progress,
  fileProgress = [],
  uploadStatus,
  error,
  onRetry,
  onCancel,
}: UploadProgressProps) {
  if (uploadStatus === 'idle') return null

  const totalItems = files.length + textItems.length

  const getStatusIcon = (status: FileUploadProgress['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock size={16} className="text-muted-foreground" />
      case 'starting':
        return <Loader2 size={16} className="text-amber-500 animate-spin" />
      case 'uploading':
        return <Upload size={16} className="text-blue-500" />
      case 'finalizing':
        return <Zap size={16} className="text-purple-500" />
      case 'completed':
        return <CheckCircle size={16} className="text-emerald-500" />
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />
      default:
        return <File size={16} className="text-muted-foreground" />
    }
  }

  const getStatusColor = (status: FileUploadProgress['status']): string => {
    switch (status) {
      case 'waiting':
        return 'text-muted-foreground'
      case 'starting':
        return 'text-amber-500'
      case 'uploading':
        return 'text-blue-500'
      case 'finalizing':
        return 'text-purple-500'
      case 'completed':
        return 'text-emerald-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getFileProgress = (
    filename: string,
  ): FileUploadProgress | undefined => {
    return fileProgress.find((fp) => fp.filename === filename)
  }

  const getHeaderIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Upload size={20} className="text-blue-500" />
      case 'success':
        return <CheckCircle size={20} className="text-emerald-500" />
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />
      default:
        return <Upload size={20} className="text-muted-foreground" />
    }
  }

  const getHeaderTitle = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading...'
      case 'success':
        return 'Upload Complete'
      case 'error':
        return 'Upload Failed'
      default:
        return 'Upload'
    }
  }

  return (
    <Card
      className={cn(
        'border-none bg-card/30 backdrop-blur-xl shadow-lg',
        'transition-all duration-300',
      )}
    >
      <CardHeader className="border-b border-border/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getHeaderIcon()}
            <CardTitle className="text-xl">{getHeaderTitle()}</CardTitle>
          </div>
          {onCancel && uploadStatus === 'uploading' && (
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-500"
            >
              <X size={16} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Overall Progress */}
        {(uploadStatus === 'uploading' || uploadStatus === 'success') && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{totalItems} item(s)</span>
              <span className="text-muted-foreground">
                {uploadStatus === 'success'
                  ? '100%'
                  : `${progress.percentage}%`}
              </span>
            </div>

            <Progress
              value={uploadStatus === 'success' ? 100 : progress.percentage}
              className="h-2"
            />

            {progress.total > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatFileSize(progress.loaded)} uploaded</span>
                <span>{formatFileSize(progress.total)} total</span>
              </div>
            )}
          </div>
        )}

        {/* File List */}
        <div className="space-y-3">
          {files.map((file, index) => {
            const fileProgressData = getFileProgress(file.name)
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                key={index}
                className={cn(
                  'p-4 rounded-lg border border-border/30 bg-background/30 backdrop-blur-sm',
                  'transition-all duration-200',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {fileProgressData ? (
                      getStatusIcon(fileProgressData.status)
                    ) : uploadStatus === 'success' ? (
                      <CheckCircle size={16} className="text-emerald-500" />
                    ) : (
                      <File size={16} className="text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs capitalize',
                        fileProgressData
                          ? getStatusColor(fileProgressData.status)
                          : 'text-muted-foreground',
                      )}
                    >
                      {fileProgressData?.status ||
                        (uploadStatus === 'success' ? 'completed' : 'waiting')}
                    </Badge>
                    {fileProgressData && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {fileProgressData.percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual File Progress */}
                {fileProgressData && fileProgressData.status !== 'waiting' && (
                  <div className="space-y-2">
                    <Progress
                      value={fileProgressData.percentage}
                      className="h-1.5"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {formatFileSize(fileProgressData.uploadedBytes)}
                      </span>
                      <span>{formatFileSize(fileProgressData.totalBytes)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {textItems.map((item, index) => {
            const filename = item.filename || `text-${index + 1}.txt`
            const fileProgressData = getFileProgress(filename)
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: no unique identifier available
                key={index}
                className={cn(
                  'p-4 rounded-lg border border-border/30 bg-background/30 backdrop-blur-sm',
                  'transition-all duration-200',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {fileProgressData ? (
                      getStatusIcon(fileProgressData.status)
                    ) : uploadStatus === 'success' ? (
                      <CheckCircle size={16} className="text-emerald-500" />
                    ) : (
                      <FileText size={16} className="text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.filename?.endsWith('.txt')
                          ? item.filename.slice(0, -4)
                          : item.filename || `Text ${index + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.content.length} characters
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      TEXT
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs capitalize',
                        fileProgressData
                          ? getStatusColor(fileProgressData.status)
                          : 'text-muted-foreground',
                      )}
                    >
                      {fileProgressData?.status ||
                        (uploadStatus === 'success' ? 'completed' : 'waiting')}
                    </Badge>
                    {fileProgressData && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {fileProgressData.percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual File Progress */}
                {fileProgressData && fileProgressData.status !== 'waiting' && (
                  <div className="space-y-2">
                    <Progress
                      value={fileProgressData.percentage}
                      className="h-1.5"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {formatFileSize(fileProgressData.uploadedBytes)}
                      </span>
                      <span>{formatFileSize(fileProgressData.totalBytes)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Error State */}
        {uploadStatus === 'error' && (
          <div
            className={cn(
              'p-4 rounded-lg border',
              'bg-red-50/80 border-red-200/50 dark:bg-red-950/30 dark:border-red-800/50',
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-red-500" />
              <span className="font-medium text-red-900 dark:text-red-100">
                Upload Failed
              </span>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">
              {error || 'An error occurred during upload'}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RotateCcw size={14} className="mr-2" />
                Retry Upload
              </Button>
              {onCancel && (
                <Button onClick={onCancel} variant="outline" size="sm">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {uploadStatus === 'success' && (
          <div
            className={cn(
              'p-4 rounded-lg border',
              'bg-emerald-50/80 border-emerald-200/50 dark:bg-emerald-950/30 dark:border-emerald-800/50',
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-emerald-500" />
              <span className="font-medium text-emerald-900 dark:text-emerald-100">
                Upload Completed Successfully!
              </span>
            </div>
            <p className="text-emerald-700 dark:text-emerald-300 text-sm">
              All {totalItems} item(s) have been uploaded and are ready to
              share.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
