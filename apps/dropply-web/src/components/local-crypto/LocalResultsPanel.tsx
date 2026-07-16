import { Button } from '@cdlab/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import { IKEmpty, StatusEnum } from '@cdlab/ui/IK'
import { Archive, Download, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const completed = results.filter((r) => r.status === StatusEnum.COMPLETED)

  return (
    <Card className="flex flex-col p-4 border-none h-full">
      <CardHeader className="p-0 flex flex-row items-center justify-between">
        <CardTitle>{t('results.title')}</CardTitle>
        <CardAction>
          {results.length > 0 && (
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
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-0 overflow-hidden">
        {results.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 p-0.5">
            {results.map((result) => (
              <LocalResultCard
                key={result.id}
                result={result}
                onDownload={onDownload}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : (
          <IKEmpty
            className="min-h-65"
            icon={Archive}
            iconClassName="size-5"
            title={t('results.emptyTitle')}
            description={t('results.emptyDescription')}
            hint={t('results.emptyHint')}
          />
        )}
      </CardContent>
    </Card>
  )
}
