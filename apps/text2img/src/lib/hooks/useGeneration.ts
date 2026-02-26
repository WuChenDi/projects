import { useMutation } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { genid } from '@/lib/genid'
import type { GenerateParams, GenerationResult } from '@/types'
import { GenerationStatus } from '@/types'

interface ErrorResponse {
  error?: string
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
  const [results, setResults] = useState<GenerationResult[]>([])
  const currentIdRef = useRef('')
  const startTimeRef = useRef(0)

  const mutation = useMutation({
    mutationFn: generateImage,
    onMutate: (params) => {
      const id = String(genid.nextId())
      currentIdRef.current = id
      startTimeRef.current = performance.now()

      setResults((prev) => [
        { id, status: GenerationStatus.PENDING, params },
        ...prev,
      ])
    },
    onSuccess: (blob) => {
      const id = currentIdRef.current
      const imageUrl = URL.createObjectURL(blob)
      const generationTime = (performance.now() - startTimeRef.current) / 1000

      setResults((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: GenerationStatus.COMPLETED,
                imageUrl,
                generationTime,
              }
            : r,
        ),
      )
      toast.success('图像生成成功！')
    },
    onError: (error: Error) => {
      const id = currentIdRef.current

      setResults((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: GenerationStatus.FAILED,
                error: error.message || '生成失败',
              }
            : r,
        ),
      )
      toast.error(error.message || '生成失败')
    },
  })

  const handleGenerateClick = useCallback(
    (params: GenerateParams) => {
      mutation.mutate(params)
    },
    [mutation],
  )

  const handleRemove = useCallback((id: string) => {
    setResults((prev) => {
      const target = prev.find((r) => r.id === id)
      if (target?.imageUrl) {
        URL.revokeObjectURL(target.imageUrl)
      }
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  const handleClearAll = useCallback(() => {
    setResults((prev) => {
      for (const r of prev) {
        if (r.imageUrl) {
          URL.revokeObjectURL(r.imageUrl)
        }
      }
      return []
    })
  }, [])

  return {
    mutation,
    results,
    handleGenerateClick,
    handleRemove,
    handleClearAll,
  }
}
