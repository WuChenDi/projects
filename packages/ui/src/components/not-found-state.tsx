'use client'

import { Button } from '@cdlab/ui/components/button'

export interface NotFoundStateProps {
  code?: string
  title?: string
  description?: string
  backLabel?: string
  homeLabel?: string
  onBack?: () => void
  onHome?: () => void
}

export function NotFoundState({
  code = '404',
  title = 'Page Not Found',
  description = "The page you're looking for may have been removed, moved, or never existed.",
  backLabel = 'Go back',
  homeLabel = 'Back to Home',
  onBack,
  onHome,
}: NotFoundStateProps) {
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
          {onBack && (
            <Button onClick={onBack} variant="default" size="lg">
              {backLabel}
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
