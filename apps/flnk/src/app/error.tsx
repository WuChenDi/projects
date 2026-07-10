'use client'

import { Button } from '@cdlab/ui/components/button'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center">
      <span className="text-[9rem] leading-none font-extrabold text-foreground/10 select-none tracking-tighter">
        500
      </span>
      <div className="-mt-10 flex flex-col items-center gap-3">
        <h1 className="text-xl font-medium">Something Went Wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          An unexpected error occurred. You can try again or return to the home
          page.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <Button onClick={reset} variant="default" size="lg">
            Try again
          </Button>
          <Button onClick={() => router.push('/')} variant="ghost" size="lg">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
