'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Card } from '@cdlab996/ui/components/card'
import { ChevronLeftIcon, CircleAlertIcon, RefreshCwIcon } from 'lucide-react'

interface PlayerErrorProps {
  error: string
  onBack: () => void
  onRetry: () => void
}

export function PlayerError({ error, onBack, onRetry }: PlayerErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Card className="p-4 md:p-6 max-w-2xl">
        <CircleAlertIcon size={64} className="mx-auto mb-4 text-red-500" />
        <h2 className="text-2xl font-bold text-foreground mb-4">
          视频源不可用
        </h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="default"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ChevronLeftIcon size={20} />
            <span>返回</span>
          </Button>
          <Button
            variant="outline"
            onClick={onRetry}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon size={20} />
            <span>重试</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
