'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Archive, Trash2 } from 'lucide-react'
import { ShareResultCard } from '@/components/share/ShareResultCard'
import { UploadProgress } from '@/components/UploadProgress'
import type { ShareResult } from '@/store/useShareStore'
import type { FileUploadProgress, TextItem } from '@/types'

interface ShareResultsProps {
  results: ShareResult[]
  emailShareEnabled: boolean
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
  isUploading: boolean
  uploadProgress: { percentage: number; loaded: number; total: number }
  fileProgress: FileUploadProgress[]
  files: File[]
  textItems: TextItem[]
  error?: string
  onRemove: (id: string) => void
  onClearAll: () => void
  onEmailShare: (code: string) => void
  onRetry: () => void
  onCancel: () => void
}

export function ShareResults({
  results,
  emailShareEnabled,
  uploadStatus,
  isUploading,
  uploadProgress,
  fileProgress,
  files,
  textItems,
  error,
  onRemove,
  onClearAll,
  onEmailShare,
  onRetry,
  onCancel,
}: ShareResultsProps) {
  const showProgress = uploadStatus === 'uploading' || uploadStatus === 'error'
  const showEmpty =
    results.length === 0 && !showProgress

  return (
    <Card className="flex flex-col shadow-none h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Results</CardTitle>
        <CardAction>
          {results.length > 0 && (
            <Button onClick={onClearAll} size="sm" variant="secondary">
              <Trash2 size={14} />
              Clear All
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-auto">
        {showProgress && (
          <UploadProgress
            files={files}
            textItems={textItems}
            isUploading={isUploading}
            progress={uploadProgress}
            fileProgress={fileProgress}
            uploadStatus={uploadStatus}
            error={error}
            onRetry={onRetry}
            onCancel={onCancel}
          />
        )}
        {results.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {results.map((result) => (
              <ShareResultCard
                key={result.id}
                result={result}
                emailShareEnabled={emailShareEnabled}
                onRemove={onRemove}
                onEmailShare={onEmailShare}
              />
            ))}
          </div>
        ) : showEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center gap-3">
            <div className="p-4 rounded-full bg-muted/50">
              <Archive size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No results yet
            </p>
            <p className="text-xs text-muted-foreground">
              Add files or text on the left, then click upload
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
