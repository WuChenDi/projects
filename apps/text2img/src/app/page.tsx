'use client'

import { Button } from '@cdlab996/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PageContainer } from '@/components/layout'
import { AdvancedOptions } from '@/components/page/AdvancedOptions'
import { BasicSettings } from '@/components/page/BasicSettings'
import { ImageResult } from '@/components/page/ImageResult'
import { fetchModels, fetchPrompts, genid } from '@/lib'
import { useGeneration } from '@/lib/hooks/useGeneration'
import type { GenerateParams, ModelGroup } from '@/types'

export default function Home() {
  const [prompt, setPrompt] = useState('cyberpunk cat')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('flux-1-schnell')
  const [password, setPassword] = useState('')

  // Advanced options
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [numSteps, setNumSteps] = useState(20)
  const [guidance, setGuidance] = useState(7.5)
  const [seed, setSeed] = useState<number | ''>('')

  const { data: modelGroups } = useQuery<ModelGroup[]>({
    queryKey: ['ModelGroups'],
    queryFn: fetchModels,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const { data: prompts } = useQuery<string[]>({
    queryKey: ['prompts'],
    queryFn: fetchPrompts,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const {
    mutation,
    results,
    handleGenerateClick,
    handleRemove,
    handleClearAll,
  } = useGeneration()

  const models = modelGroups
    ? modelGroups.flatMap((group) => group.models)
    : undefined

  const handleRandomPrompt = () => {
    if (prompts && prompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * prompts.length)
      setPrompt(prompts[randomIndex])
    }
  }

  const handleRandomSeed = () => {
    setSeed(genid.nextNumber())
  }

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
    <PageContainer scrollable={false}>
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <div className="space-y-4">
          <BasicSettings
            modelGroups={modelGroups}
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

        <ImageResult
          results={results}
          models={models}
          onRemove={handleRemove}
          onClearAll={handleClearAll}
        />
      </div>
    </PageContainer>
  )
}
