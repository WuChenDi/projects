import { Button } from '@cdlab/ui/components/button'
import { StatusEnum } from '@cdlab/ui/IK'
import { cn } from '@cdlab/ui/lib/utils'
import { ChevronDown, Download, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { ProcessResult } from '@/types/crypto'
import { LocalResultCard } from './LocalResultCard'

interface LocalResultsPanelProps {
  results: ProcessResult[]
  onDownload: (result: ProcessResult) => void
  onRemove: (id: string) => void
  onClearAll: () => void
}

export function LocalResultsPanel({
  results,
  onDownload,
  onRemove,
  onClearAll,
}: LocalResultsPanelProps) {
  const t = useTranslations('localCrypto')
  const [expanded, setExpanded] = useState(true)
  const completed = results.filter((r) => r.status === StatusEnum.COMPLETED)

  // Nothing to show until there's a result — no empty-state box.
  if (results.length === 0) return null

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform duration-200',
              !expanded && '-rotate-90',
            )}
          />
          {t('results.title')}
          <span className="text-muted-foreground">({results.length})</span>
        </button>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              completed.forEach((result) => onDownload(result))
            }}
            size="sm"
            variant="secondary"
            disabled={completed.length === 0}
          >
            <Download />
            {t('results.downloadAll')}
          </Button>
          <Button onClick={onClearAll} size="sm" variant="secondary">
            <Trash2 />
            {t('results.clearAll')}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 gap-3 p-0.5 sm:grid-cols-3">
          {results.map((result) => (
            <LocalResultCard
              key={result.id}
              result={result}
              onDownload={onDownload}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}
