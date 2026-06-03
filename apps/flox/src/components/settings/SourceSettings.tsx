'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState } from 'react'
import { toast } from 'sonner'
import { SourceManager } from '@/components/settings/SourceManager'
import { DEFAULT_SOURCES } from '@/lib/api/default-sources'
import { PREMIUM_SOURCES } from '@/lib/api/premium-sources'
import { useSourceHealthCheck } from '@/lib/hooks/useSourceHealthCheck'
import type { VideoSource } from '@/lib/types'

interface SourceSettingsProps {
  sources: VideoSource[]
  onSourcesChange: (sources: VideoSource[]) => void
  onRestoreDefaults: () => void
  onAddSource: () => void
  onEditSource?: (source: VideoSource) => void
  isPremium?: boolean
}

export function SourceSettings({
  sources,
  onSourcesChange,
  onRestoreDefaults,
  onAddSource,
  onEditSource,
  isPremium = false,
}: SourceSettingsProps) {
  const [showAllSources, setShowAllSources] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { checking, progress, runCheck } = useSourceHealthCheck()

  const filteredSources = sources.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.baseUrl.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const displayedSources =
    showAllSources || searchQuery
      ? filteredSources
      : filteredSources.slice(0, 10)

  const handleToggle = (id: string) => {
    const updated = sources.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s,
    )
    onSourcesChange(updated)
  }

  const handleDelete = (id: string) => {
    onSourcesChange(sources.filter((s) => s.id !== id))
  }

  const handleHealthCheck = async () => {
    if (sources.length === 0) return

    const healthy = await runCheck(sources)

    // Disable unreachable sources, then push all disabled ones to the bottom
    // while preserving the existing order within each group (stable sort).
    const updated = sources
      .map((s) => ({ ...s, enabled: healthy.has(s.id) }))
      .sort((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1))
      .map((s, i) => ({ ...s, priority: i + 1 }))

    onSourcesChange(updated)
    toast.success(
      `检测完成：可用 ${healthy.size} / ${sources.length}，已关闭 ${
        sources.length - healthy.size
      } 个`,
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sources.findIndex((s) => s.id === active.id)
    const newIndex = sources.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const updated = arrayMove(sources, oldIndex, newIndex).map((s, i) => ({
      ...s,
      priority: i + 1,
    }))
    onSourcesChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isPremium ? '高级源管理' : '视频源管理'}</CardTitle>
        <CardDescription>
          {isPremium
            ? '管理高级内容来源，调整优先级和启用状态'
            : '管理视频来源，调整优先级和启用状态'}
        </CardDescription>
        <CardAction className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleHealthCheck}
            disabled={checking || sources.length === 0}
          >
            {checking
              ? `检测中 ${progress.done}/${progress.total}`
              : '检查可用性'}
          </Button>
          <Button variant="outline" size="sm" onClick={onRestoreDefaults}>
            恢复默认
          </Button>
          <Button size="sm" onClick={onAddSource}>
            添加源
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <Input
          placeholder="搜索源..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        <SourceManager
          sources={displayedSources}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onDragEnd={handleDragEnd}
          onEdit={onEditSource}
          defaultIds={(isPremium ? PREMIUM_SOURCES : DEFAULT_SOURCES).map(
            (s) => s.id,
          )}
        />
      </CardContent>

      {!searchQuery && sources.length > 10 && (
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAllSources(!showAllSources)}
          >
            {showAllSources ? '收起' : `显示全部 (${sources.length})`}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
