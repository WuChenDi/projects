'use client'

import { Card } from '@cdlab/ui/components/card'
import { TvIcon } from 'lucide-react'

export function VideoPlayerEmpty() {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="aspect-video bg-background/95 backdrop-blur-xl saturate-[180%] rounded-2xl flex items-center justify-center border border-border">
        <div className="text-center text-muted-foreground">
          <TvIcon size={64} className="text-muted-foreground mx-auto mb-4" />
          <p>暂无播放源</p>
        </div>
      </div>
    </Card>
  )
}
