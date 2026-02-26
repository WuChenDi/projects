import { format } from 'date-fns'
import { Copy, Download, Eye, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'
import { SCAssetFailed } from '@/components/SC/SCAssetFailed'
import { SCAssetLoading } from '@/components/SC/SCAssetLoading'
import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab996/ui/components/dialog'
import { Separator } from '@cdlab996/ui/components/separator'
import type { GenerateParams, GenerationResult, Model } from '@/types'
import { GenerationStatus } from '@/types'

const PARAM_LABELS: Record<string, string> = {
  prompt: '提示词',
  negative_prompt: '反向提示词',
  model: '模型',
  width: '宽度',
  height: '高度',
  num_steps: '步数',
  guidance: '引导',
  seed: '种子',
}

interface ImageResultCardProps {
  result: GenerationResult
  models?: Model[]
  onRemove: (id: string) => void
}

function copyParams(params: GenerateParams) {
  let paramsText = '--- AI绘图创作生成参数 ---\n'
  const paramNames: Record<string, string> = {
    prompt: '正向提示词',
    negative_prompt: '反向提示词',
    model: '文生图模型',
    width: '图像宽度',
    height: '图像高度',
    num_steps: '迭代步数',
    guidance: '引导系数',
    seed: '随机种子',
  }

  Object.entries(params).forEach(([key, value]) => {
    if (key === 'password' || !value) return
    const name = paramNames[key] || key
    paramsText += `${name}: ${value}\n`
  })

  navigator.clipboard.writeText(paramsText).then(
    () => toast.success('参数已复制到剪贴板'),
    () => toast.error('复制失败'),
  )
}

function downloadImage(result: GenerationResult, models?: Model[]) {
  if (!result.imageUrl) return

  const link = document.createElement('a')
  link.href = result.imageUrl
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  const modelName =
    models?.find((m) => m.id === result.params.model)?.name || 'ai-image'
  link.download = `${modelName}-${timestamp}.png`
  link.click()
  toast.success('图像下载成功')
}

export function ImageResultCard({
  result,
  models,
  onRemove,
}: ImageResultCardProps) {
  const [open, setOpen] = useState(false)
  const modelName = models?.find((m) => m.id === result.params.model)?.name
  const isCompleted = result.status === GenerationStatus.COMPLETED

  return (
    <>
      <div className="group relative rounded-lg overflow-hidden bg-muted">
        <div className="aspect-square relative flex items-center justify-center">
          {result.status === GenerationStatus.PENDING && <SCAssetLoading />}

          {result.status === GenerationStatus.FAILED && (
            <SCAssetFailed error={result.error} />
          )}

          {isCompleted && result.imageUrl && (
            // biome-ignore lint/performance/noImgElement: dynamic image source requires img element
            <img
              src={result.imageUrl}
              alt="Generated"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Action buttons overlay */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isCompleted && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="size-7"
                onClick={() => setOpen(true)}
                title="查看详情"
              >
                <Eye className="size-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-7"
                onClick={() => copyParams(result.params)}
                title="复制参数"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-7"
                onClick={() => downloadImage(result, models)}
                title="下载图像"
              >
                <Download className="size-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="size-7"
            onClick={() => onRemove(result.id)}
            title="删除"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>图像详情</DialogTitle>
            {modelName && (
              <DialogDescription>模型：{modelName}</DialogDescription>
            )}
          </DialogHeader>

          {isCompleted && result.imageUrl && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <Image
                src={result.imageUrl}
                alt="Generated"
                fill
                className="object-contain"
              />
            </div>
          )}

          {result.status === GenerationStatus.FAILED && (
            <SCAssetFailed error={result.error} />
          )}

          {isCompleted && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {result.generationTime && (
                  <div>
                    <span className="font-medium">生成时间：</span>
                    {result.generationTime.toFixed(2)}秒
                  </div>
                )}
                {result.params.width && (
                  <div>
                    <span className="font-medium">尺寸：</span>
                    {result.params.width}x{result.params.height}
                  </div>
                )}
                {result.params.num_steps && (
                  <div>
                    <span className="font-medium">步数：</span>
                    {result.params.num_steps}
                  </div>
                )}
                {result.params.guidance && (
                  <div>
                    <span className="font-medium">引导：</span>
                    {result.params.guidance}
                  </div>
                )}
                {result.params.seed && (
                  <div>
                    <span className="font-medium">种子：</span>
                    {result.params.seed}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">所有参数</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.params).map(([key, value]) => {
                    if (key === 'password' || !value) return null
                    return (
                      <Badge key={key} variant="secondary">
                        <span className="font-medium">
                          {PARAM_LABELS[key] || key}:
                        </span>{' '}
                        {String(value).substring(0, 50)}
                        {String(value).length > 50 ? '...' : ''}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            {isCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyParams(result.params)}
                >
                  <Copy className="size-4" />
                  复制参数
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadImage(result, models)}
                >
                  <Download className="size-4" />
                  下载图像
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
