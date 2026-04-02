'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { AlertCircle, Download, Loader2, Trash2, X } from 'lucide-react'
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

export function RetrieveResults({
  results,
  isRetrieving,
  error,
  onClearError,
  onDownload,
  onRemove,
  onClearAll,
}: RetrieveResultsProps) {
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
        {error && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-red-200/50 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/50">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
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
              <X size={14} />
            </Button>
          </div>
        )}
        {isRetrieving && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-muted/20">
            <Loader2 size={20} className="text-primary animate-spin" />
            <span className="text-sm font-medium">Retrieving files...</span>
          </div>
        )}
        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result) => (
              <RetrieveResultCard
                key={result.id}
                result={result}
                onDownload={onDownload}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : !isRetrieving ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center gap-3">
            <div className="p-4 rounded-full bg-muted/50">
              <Download size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No results yet
            </p>
            <p className="text-xs text-muted-foreground">
              Enter a retrieval code and key to access shared files
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
