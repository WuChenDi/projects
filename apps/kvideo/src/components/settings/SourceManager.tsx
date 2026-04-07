'use client'

import { useState } from 'react'
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
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    onToggle(id)
  }

  const handleDelete = (id: string) => {
    onDelete(id)
  }

  const handlePriorityChange = (id: string, direction: 'up' | 'down') => {
    onReorder(id, direction)
  }

  return (
    <div className="space-y-3">
      {sources.map((source, index) => (
        <div
          key={source.id}
          className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] p-4 transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle(source.id)}
                className="relative inline-block w-12 h-7 flex-shrink-0 cursor-pointer"
                aria-label={`切换 ${source.name} 状态`}
              >
                <span
                  className={`absolute inset-0 rounded-[var(--radius-full)] transition-all duration-[0.4s] cubic-bezier(0.2,0.8,0.2,1) ${
                    source.enabled
                      ? 'bg-[var(--accent-color)]'
                      : 'bg-[color-mix(in_srgb,var(--text-color)_20%,transparent)]'
                  }`}
                />
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-[var(--radius-full)] shadow-sm transition-transform duration-[0.4s] cubic-bezier(0.2,0.8,0.2,1) ${
                    source.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Source Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--text-color)] truncate">
                  {source.name}
                </div>
                <div className="text-sm text-[var(--text-color-secondary)] truncate">
                  {source.baseUrl}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Priority Controls */}
              <button
                onClick={() => handlePriorityChange(source.id, 'up')}
                disabled={index === 0}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                aria-label="上移"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>

              <button
                onClick={() => handlePriorityChange(source.id, 'down')}
                disabled={index === sources.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                aria-label="下移"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </button>

              {/* Edit Button - Only for custom sources */}
              {onEdit && !defaultIds.includes(source.id) && (
                <button
                  onClick={() => onEdit(source)}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
                  aria-label="编辑视频源"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(source.id)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 cursor-pointer"
                aria-label="删除视频源"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
