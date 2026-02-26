
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

interface ErrorResponse {
  error?: string
}

export interface GenerateParams {
  prompt: string
  model: string
  password?: string
  negative_prompt?: string
  width?: number
  height?: number
  num_steps?: number
  guidance?: number
  seed?: number
}

async function generateImage(params: GenerateParams): Promise<Blob> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const errorData = (await response.json()) as ErrorResponse
      throw new Error(errorData.error || 'Failed to generate image')
    }
    throw new Error('Failed to generate image')
  }

  return response.blob()
}

export function useGeneration() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generationTime, setGenerationTime] = useState<number | null>(null)
  const [currentParams, setCurrentParams] = useState<GenerateParams | null>(
    null,
  )

  const mutation = useMutation({
    mutationFn: generateImage,
    onMutate: () => {
      setGenerationTime(null)
    },
    onSuccess: (blob) => {
      const imageUrl = URL.createObjectURL(blob)
      setGeneratedImage(imageUrl)
      toast.success('图像生成成功！')
    },
    onError: (error: Error) => {
      toast.error(error.message || '生成失败')
    },
  })

  const handleGenerateClick = (params: GenerateParams) => {
    const startTime = performance.now()
    setCurrentParams(params)
    mutation.mutate(params, {
      onSuccess: () => {
        const endTime = performance.now()
        setGenerationTime((endTime - startTime) / 1000)
      },
    })
  }

  return {
    mutation,
    generatedImage,
    generationTime,
    currentParams,
    handleGenerateClick,
  }
}
