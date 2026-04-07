'use client'

import { Card } from '@cdlab996/ui/components/card'
import { TvIcon } from 'lucide-react'

export function VideoPlayerEmpty() {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="aspect-video bg-[var(--glass-bg)] backdrop-blur-[25px] saturate-[180%] rounded-[var(--radius-2xl)] flex items-center justify-center border border-[var(--glass-border)]">
        <div className="text-center text-[var(--text-secondary)]">
          <TvIcon
            size={64}
            className="text-[var(--text-color-secondary)] mx-auto mb-4"
          />
          <p>暂无播放源</p>
        </div>
      </div>
    </Card>
  )
}
