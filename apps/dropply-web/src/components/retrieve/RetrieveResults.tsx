'use client'

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
} from '@cdlab/ui/components/alert-dialog'
import { Button } from '@cdlab/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import { Skeleton } from '@cdlab/ui/components/skeleton'
import { cn } from '@cdlab/ui/lib/utils'
import { AlertCircle, Download, Loader2, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { RetrieveResultCard } from '@/components/retrieve/RetrieveResultCard'
import type { RetrieveResult } from '@/store/useRetrieveStore'

interface RetrieveResultsProps {
  results: RetrieveResult[]
  isRetrieving: boolean
  error: string | null
  onClearError: () => void
  onDownload: (
    fileId: string,
    chestToken: string,
    filename: string,
    encryptionKey: string,
  ) => void
  onRemove: (id: string) => void
  onClearAll: () => void
}

function RetrievingCard() {
  return (
    <Card
      className={cn(
        'relative p-4 border',
        'bg-linear-to-br from-emerald-50/30 to-teal-50/30 border-emerald-200/30',
        'dark:from-emerald-950/10 dark:to-teal-950/10 dark:border-emerald-800/20',
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 text-primary animate-spin shrink-0" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-7 w-full rounded-md" />
        <Skeleton className="h-3 w-24" />
      </div>
    </Card>
  )
}

export function RetrieveResults({
  results,
  isRetrieving,
  error,
  onClearError,
  onDownload,
  onRemove,
  onClearAll,
}: RetrieveResultsProps) {
  const t = useTranslations('retrieve')

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
        {error && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-red-200/50 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/50">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                {error}
              </p>
            </div>
            <Button
              onClick={onClearError}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 h-auto p-1 shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        {isRetrieving || results.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {isRetrieving && <RetrievingCard />}
            {results.map((result) => (
              <RetrieveResultCard
                key={result.id}
                result={result}
                onDownload={onDownload}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : !error ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center gap-3">
            <div className="p-4 rounded-full bg-muted/50">
              <Download className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('noResultsYet')}
            </p>
            <p className="text-xs text-muted-foreground">{t('emptyHint')}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
