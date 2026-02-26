import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Separator } from '@cdlab996/ui/components/separator'
import { Copy, Download, Loader2 } from 'lucide-react'
import type { GenerateParams } from '@/lib/hooks/useGeneration'
import type { Model } from '@/types'

interface ImageResultProps {
  generatedImage: string | null
  isPending: boolean
  generationTime: number | null
  models: Model[] | undefined
  selectedModel: string
  currentParams: GenerateParams | null
  handleCopyParams: () => void
  handleDownload: () => void
}

export function ImageResult({
  generatedImage,
  isPending,
  generationTime,
  models,
  selectedModel,
  currentParams,
  handleCopyParams,
  handleDownload,
}: ImageResultProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>生成结果</CardTitle>
          {generatedImage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyParams}>
                <Copy className="size-4" />
                复制参数
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="size-4" />
                下载图像
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {isPending && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
              <p className="text-white mt-3 font-medium">生成中,请稍候...</p>
              <p className="text-white/80 text-sm mt-1">
                这可能需要几秒到几十秒不等
              </p>
            </div>
          )}

          {!generatedImage && !isPending && (
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-2">🖼️</div>
              <p>点击生成按钮开始创建图像</p>
            </div>
          )}

          {generatedImage && (
            // biome-ignore lint/performance/noImgElement: dynamic image source requires img element
            <img
              src={generatedImage}
              alt="Generated"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>

        {generatedImage && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">生成时间：</span>
                <span className="ml-1">{generationTime?.toFixed(2)}秒</span>
              </div>
              <div>
                <span className="font-medium">使用模型：</span>
                <span className="ml-1">
                  {models?.find((m) => m.id === selectedModel)?.name || '-'}
                </span>
              </div>
            </div>

            {currentParams && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-2">所有参数</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentParams).map(([key, value]) => {
                      if (key === 'password' || !value) return null
                      const paramNames: Record<string, string> = {
                        prompt: '提示词',
                        negative_prompt: '反向提示词',
                        model: '模型',
                        width: '宽度',
                        height: '高度',
                        num_steps: '步数',
                        guidance: '引导',
                        seed: '种子',
                      }
                      return (
                        <div
                          key={key}
                          className="text-xs bg-secondary px-2 py-1 rounded"
                        >
                          <span className="font-medium">
                            {paramNames[key] || key}:
                          </span>{' '}
                          {String(value).substring(0, 50)}
                          {String(value).length > 50 ? '...' : ''}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
