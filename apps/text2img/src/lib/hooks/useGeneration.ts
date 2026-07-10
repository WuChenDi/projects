import { hashPasswordFn } from '@cdlab/utils'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { genid } from '@/lib/genid'
import { useImageStore } from '@/store/useImageStore'
import type { GenerateParams } from '@/types'
import { GenerationStatus } from '@/types'

interface ErrorResponse {
  error?: string
}

async function generateImage(params: GenerateParams): Promise<Blob> {
  // Hash the password client-side so the plaintext never leaves the browser;
  // the server verifies this hash against the configured passwords.
  const payload = params.password
    ? { ...params, password: await hashPasswordFn(params.password) }
    : params

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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
  const t = useTranslations('generation')
  const results = useImageStore((s) => s.results)
  const addResult = useImageStore((s) => s.addResult)
  const completeResult = useImageStore((s) => s.completeResult)
  const failResult = useImageStore((s) => s.failResult)
  const removeResult = useImageStore((s) => s.removeResult)
  const clearAll = useImageStore((s) => s.clearAll)
  const currentIdRef = useRef('')
  const startTimeRef = useRef(0)

  const mutation = useMutation({
    mutationFn: generateImage,
    onMutate: (params) => {
      const id = String(genid.nextId())
      currentIdRef.current = id
      startTimeRef.current = performance.now()

      addResult({ id, status: GenerationStatus.PENDING, params })
    },
    onSuccess: (blob) => {
      const id = currentIdRef.current
      const generationTime = (performance.now() - startTimeRef.current) / 1000
      completeResult(id, blob, generationTime)
      toast.success(t('success'))
    },
    onError: (error: Error) => {
      failResult(currentIdRef.current, error.message || t('failed'))
      toast.error(error.message || t('failed'))
    },
  })

  const handleGenerateClick = useCallback(
    (params: GenerateParams) => {
      mutation.mutate(params)
    },
    [mutation],
  )

  return {
    mutation,
    results,
    handleGenerateClick,
    handleRemove: removeResult,
    handleClearAll: clearAll,
  }
}
