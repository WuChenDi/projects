'use client'

import { ErrorState } from '@cdlab/ui/components/error-state'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorState
      title="出错了"
      description="发生了意外错误。你可以重试，或返回首页。"
      resetLabel="重试"
      homeLabel="回到首页"
      onReset={reset}
      onHome={() => router.push('/')}
    />
  )
}
