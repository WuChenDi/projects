'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Switch } from '@cdlab996/ui/components/switch'
import { ArrowDown, ArrowUp, Pencil, Trash } from 'lucide-react'
import type { VideoSource } from '@/lib/types'

interface SourceManagerProps {
  sources: VideoSource[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (id: string, direction: 'up' | 'down') => void
  onEdit?: (source: VideoSource) => void
  defaultIds: string[]
}

export function SourceManager({
  sources,
  onToggle,
  onDelete,
  onReorder,
  onEdit,
  defaultIds,
}: SourceManagerProps) {
  return (
    <div className="space-y-2">
      {sources.map((source, index) => (
        <div
          key={source.id}
          className="flex items-center justify-between px-4 py-3 bg-card/60 text-card-foreground gap-4 overflow-hidden rounded-xl text-sm"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Switch
              checked={source.enabled}
              onCheckedChange={() => onToggle(source.id)}
            />

            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{source.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {source.baseUrl}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              disabled={index === 0}
              onClick={() => onReorder(source.id, 'up')}
            >
              <ArrowUp className="size-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              disabled={index === sources.length - 1}
              onClick={() => onReorder(source.id, 'down')}
            >
              <ArrowDown className="size-4" />
            </Button>

            {onEdit && !defaultIds.includes(source.id) && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(source)}
              >
                <Pencil className="size-4" />
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={() => onDelete(source.id)}
            >
              <Trash className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
