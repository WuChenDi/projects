import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { IKEmpty } from '@cdlab996/ui/IK'
import { format } from 'date-fns'
import { Download, ImageOff, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { GenerationResult, Model } from '@/types'
import { GenerationStatus } from '@/types'
import { ImageResultCard } from './ImageResultCard'

interface ImageResultProps {
  results: GenerationResult[]
  models?: Model[]
  onRemove: (id: string) => void
  onClearAll: () => void
}

export function ImageResult({
  results,
  models,
  onRemove,
  onClearAll,
}: ImageResultProps) {
  const t = useTranslations('result')

  const completedResults = results.filter(
    (r) => r.status === GenerationStatus.COMPLETED,
  )

  const handleDownloadAll = () => {
    for (const result of completedResults) {
      if (!result.imageUrl) continue
      const link = document.createElement('a')
      link.href = result.imageUrl
      const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      const modelName =
        models?.find((m) => m.id === result.params.model)?.name || 'ai-image'
      link.download = `${modelName}-${timestamp}.png`
      link.click()
    }
    toast.success(t('downloadAllStarted'))
  }

  return (
    <Card className="flex flex-col p-4 border-none h-full">
      <CardHeader className="p-0 flex flex-row items-center justify-between">
        <CardTitle>{t('title')}</CardTitle>
        <CardAction>
          {results.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadAll}
                size="sm"
                variant="secondary"
                disabled={completedResults.length === 0}
              >
                <Download className="size-4" />
                {t('downloadAll')}
              </Button>
              <Button onClick={onClearAll} size="sm" variant="secondary">
                <Trash2 className="size-4" />
                {t('clearAll')}
              </Button>
            </div>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-0 overflow-hidden">
        {results.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 p-0.5">
            {results.map((result) => (
              <ImageResultCard
                key={result.id}
                result={result}
                models={models}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : (
          <IKEmpty
            className="min-h-65"
            icon={ImageOff}
            iconClassName="size-5"
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            hint={t('emptyHint')}
          />
        )}
      </CardContent>
    </Card>
  )
}
