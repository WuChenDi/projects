import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { IKEmpty } from '@cdlab996/ui/IK'
import type { ZipFileEntry } from '@cdlab996/utils'
import { downloadFile, downloadFilesAsZip } from '@cdlab996/utils'
import { Download, ImageOff, Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
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
  const [downloading, setDownloading] = useState(false)

  const completedResults = results.filter(
    (r) => r.status === GenerationStatus.COMPLETED,
  )

  const handleDownloadAll = async () => {
    const items = completedResults.filter((r) => r.imageUrl)
    if (items.length === 0) return

    if (items.length === 1) {
      const r = items[0]
      const modelName =
        models?.find((m) => m.id === r.params.model)?.name || 'ai-image'
      downloadFile({ data: r.imageUrl!, filename: `${modelName}.png` })
      toast.success(t('downloadAllStarted'))
      return
    }

    setDownloading(true)
    try {
      const blobs = await Promise.all(
        items.map(async (r) => {
          const res = await fetch(r.imageUrl!)
          return res.blob()
        }),
      )
      const files: ZipFileEntry[] = items.map((r, i) => {
        const modelName =
          models?.find((m) => m.id === r.params.model)?.name || 'ai-image'
        return { path: `${modelName}-${i + 1}.png`, data: blobs[i] }
      })
      await downloadFilesAsZip(files, 'text2img')
      toast.success(t('downloadAllStarted'))
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
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
                disabled={completedResults.length === 0 || downloading}
              >
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
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
