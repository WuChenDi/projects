'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Progress } from '@cdlab996/ui/components/progress'
import { Skeleton } from '@cdlab996/ui/components/skeleton'
import { cn } from '@cdlab996/ui/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@cdlab996/ui/components/alert-dialog'
import {
  AlertCircle,
  Archive,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ShareResultCard } from '@/components/share/ShareResultCard'
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

function UploadingCard({
  uploadStatus,
  uploadProgress,
  error,
  onRetry,
  onCancel,
}: {
  uploadStatus: 'uploading' | 'error'
  uploadProgress: { percentage: number; loaded: number; total: number }
  error?: string
  onRetry: () => void
  onCancel: () => void
}) {
  const t = useTranslations('share')

  return (
    <Card
      className={cn(
        'relative p-4 border',
        uploadStatus === 'error'
          ? 'bg-linear-to-br from-red-50/30 to-rose-50/30 border-red-200/30 dark:from-red-950/10 dark:to-rose-950/10 dark:border-red-800/20'
          : 'bg-linear-to-br from-blue-50/30 to-indigo-50/30 border-blue-200/30 dark:from-blue-950/10 dark:to-indigo-950/10 dark:border-blue-800/20',
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {uploadStatus === 'error' ? (
              <AlertCircle className="size-4 text-red-500 shrink-0" />
            ) : (
              <Loader2 className="size-4 text-primary animate-spin shrink-0" />
            )}
            <Skeleton className="h-5 w-20" />
          </div>
          {uploadStatus === 'uploading' && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
              onClick={onCancel}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {uploadStatus === 'error' ? (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/30 p-2 rounded-lg">
            {error}
          </p>
        ) : (
          <div className="space-y-1.5">
            <Progress value={uploadProgress.percentage} className="h-1.5" />
            <Skeleton className="h-3 w-full" />
          </div>
        )}

        <div className="flex items-center gap-2">
          {uploadStatus === 'error' ? (
            <Button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="flex-1 text-xs text-red-600 border-red-300"
            >
              <RotateCcw className="size-4" />
              {t('retry')}
            </Button>
          ) : (
            <>
              <Skeleton className="h-7 flex-1 rounded-md" />
              <Skeleton className="h-7 w-9 rounded-md" />
            </>
          )}
        </div>

        <Skeleton className="h-3 w-24" />
      </div>
    </Card>
  )
}

export function ShareResults({
  results,
  emailShareEnabled,
  uploadStatus,
  isUploading,
  uploadProgress,
  error,
  onRemove,
  onClearAll,
  onEmailShare,
  onRetry,
  onCancel,
}: ShareResultsProps) {
  const t = useTranslations('share')
  const showProgress = uploadStatus === 'uploading' || uploadStatus === 'error'

  return (
    <Card className="flex flex-col shadow-none h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('results')}</CardTitle>
        <CardAction>
          {results.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Trash2 className="size-4" />
                  {t('clearAll')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('clearAll')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('clearAllConfirm')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearAll}>
                    {t('confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-auto">
        {showProgress || results.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {showProgress && (
              <UploadingCard
                uploadStatus={uploadStatus as 'uploading' | 'error'}
                uploadProgress={uploadProgress}
                error={error}
                onRetry={onRetry}
                onCancel={onCancel}
              />
            )}
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
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center gap-3">
            <div className="p-4 rounded-full bg-muted/50">
              <Archive className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('noResultsYet')}
            </p>
            <p className="text-xs text-muted-foreground">{t('emptyHint')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
