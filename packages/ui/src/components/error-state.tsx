'use client'

import { Button } from '@cdlab/ui/components/button'

export interface ErrorStateProps {
  code?: string
  title?: string
  description?: string
  resetLabel?: string
  homeLabel?: string
  onReset?: () => void
  onHome?: () => void
}

export function ErrorState({
  code = '500',
  title = 'Something Went Wrong',
  description = 'An unexpected error occurred. You can try again or return to the home page.',
  resetLabel = 'Try again',
  homeLabel = 'Back to Home',
  onReset,
  onHome,
}: ErrorStateProps) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center">
      <span className="text-[9rem] leading-none font-extrabold text-foreground/10 select-none tracking-tighter">
        {code}
      </span>
      <div className="-mt-10 flex flex-col items-center gap-3">
        <h1 className="text-xl font-medium">{title}</h1>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        <div className="mt-8 flex justify-center gap-2">
          {onReset && (
            <Button onClick={onReset} variant="default" size="lg">
              {resetLabel}
            </Button>
          )}
          {onHome && (
            <Button onClick={onHome} variant="ghost" size="lg">
              {homeLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
