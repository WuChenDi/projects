'use client'

import { Button } from '@cdlab996/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { Github, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdvancedOptions } from '@/components/page/AdvancedOptions'
import { BasicSettings } from '@/components/page/BasicSettings'
import { ImageResult } from '@/components/page/ImageResult'
import { ThemeToggle } from '@/components/theme-toggle'
import { genid } from '@/lib'
import type { GenerateParams } from '@/lib/hooks/useGeneration'
import { useGeneration } from '@/lib/hooks/useGeneration'
import type { Model } from '@/types'

async function fetchModels(): Promise<Model[]> {
  const response = await fetch('/api/models')
  if (!response.ok) {
    throw new Error('Failed to fetch models')
  }
  return response.json()
}

async function fetchPrompts(): Promise<string[]> {
  const response = await fetch('/api/prompts')
  if (!response.ok) {
    throw new Error('Failed to fetch prompts')
  }
  return response.json()
}

export default function Home() {
  const [prompt, setPrompt] = useState('cyberpunk cat')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [password, setPassword] = useState('')

  // Advanced options
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [numSteps, setNumSteps] = useState(20)
  const [guidance, setGuidance] = useState(7.5)
  const [seed, setSeed] = useState<number | ''>('')

  const { data: models } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: fetchModels,
  })

  const { data: prompts } = useQuery<string[]>({
    queryKey: ['prompts'],
    queryFn: fetchPrompts,
  })

  const {
    mutation,
    generatedImage,
    generationTime,
    currentParams,
    handleGenerateClick,
  } = useGeneration()

  const handleRandomPrompt = () => {
    if (prompts && prompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * prompts.length)
      setPrompt(prompts[randomIndex])
    }
  }

  const handleRandomSeed = () => {
    setSeed(genid.nextNumber())
  }

  const handleCopyParams = () => {
    if (!currentParams) return

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

    Object.entries(currentParams).forEach(([key, value]) => {
      if (key === 'password' || !value) return
      const name = paramNames[key] || key
      paramsText += `${name}: ${value}\n`
    })

    navigator.clipboard.writeText(paramsText).then(
      () => toast.success('参数已复制到剪贴板'),
      () => toast.error('复制失败'),
    )
  }

  const handleDownload = () => {
    if (!generatedImage) return

    const link = document.createElement('a')
    link.href = generatedImage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const modelName =
      models?.find((m) => m.id === selectedModel)?.name || 'ai-image'
    link.download = `${modelName}-${timestamp}.png`
    link.click()
    toast.success('图像下载成功')
  }

  // Set default model when models are loaded
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      setSelectedModel(models[1]?.id || models[0].id)
    }
  }, [models, selectedModel])

  const onGenerateClick = () => {
    const params: GenerateParams = {
      prompt,
      model: selectedModel,
      password: password || undefined,
      negative_prompt: negativePrompt || undefined,
      width,
      height,
      num_steps: numSteps,
      guidance,
      seed: seed || undefined,
    }
    handleGenerateClick(params)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">🐳 在线文生图服务</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link
                href="https://github.com/WuChenDi/text2img.git"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:items-start">
          <div className="lg:col-span-2 space-y-4">
            <BasicSettings
              models={models}
              password={password}
              setPassword={setPassword}
              prompt={prompt}
              setPrompt={setPrompt}
              negativePrompt={negativePrompt}
              setNegativePrompt={setNegativePrompt}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              handleRandomPrompt={handleRandomPrompt}
            />

            <AdvancedOptions
              width={width}
              setWidth={setWidth}
              height={height}
              setHeight={setHeight}
              numSteps={numSteps}
              setNumSteps={setNumSteps}
              guidance={guidance}
              setGuidance={setGuidance}
              seed={seed}
              setSeed={setSeed}
              handleRandomSeed={handleRandomSeed}
            />

            <Button
              className="w-full"
              size="lg"
              onClick={onGenerateClick}
              disabled={mutation.isPending || !selectedModel}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  生成图像
                </>
              )}
            </Button>
          </div>

          <div className="lg:col-span-3 lg:sticky lg:top-6">
            <ImageResult
              generatedImage={generatedImage}
              isPending={mutation.isPending}
              generationTime={generationTime}
              models={models}
              selectedModel={selectedModel}
              currentParams={currentParams}
              handleCopyParams={handleCopyParams}
              handleDownload={handleDownload}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
