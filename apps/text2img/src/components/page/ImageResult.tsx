import { format } from 'date-fns'
import { Download, ImageOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cdlab996/ui/components/empty'
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
    toast.success('已开始下载全部图像')
  }

  return (
    <Card className="flex flex-col p-4 border-none h-full">
      <CardHeader className="p-0 flex flex-row items-center justify-between">
        <CardTitle>生成结果</CardTitle>
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
                下载全部
              </Button>
              <Button onClick={onClearAll} size="sm" variant="secondary">
                <Trash2 className="size-4" />
                清空全部
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
          <Empty className="min-h-65">
            <EmptyMedia variant="icon">
              <ImageOff className="size-5" />
            </EmptyMedia>

            <EmptyHeader>
              <EmptyTitle>暂无生成结果</EmptyTitle>
              <EmptyDescription>
                输入提示词并点击生成按钮开始创建 AI 图像
              </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <p className="text-xs text-muted-foreground/80">
                支持多种模型，可调节尺寸、步数、引导系数等参数
              </p>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
