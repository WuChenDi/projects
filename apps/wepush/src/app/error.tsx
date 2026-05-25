'use client'

import { Button } from '@cdlab996/ui/components/button'
import Link from 'next/link'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[wepush] route error', error)
  }, [error])

  return (
    <main className="container mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">出错了</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || '加载页面时发生未知错误'}
      </p>
      {error.digest ? (
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          digest: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>重试</Button>
        <Link href="/">
          <Button variant="ghost">回首页</Button>
        </Link>
      </div>
    </main>
  )
}
