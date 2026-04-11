'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Input } from '@cdlab996/ui/components/input'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RefreshCw, Tag as TagIcon, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Tag } from '@/lib/types'

interface TagManagerProps {
  tags: Tag[]
  selectedTag: string
  showTagManager: boolean
  newTagInput: string
  isLoadingTags?: boolean

  onTagSelect: (tagId: string) => void
  onTagDelete: (tagId: string) => void
  onToggleManager: () => void
  onRestoreDefaults: () => void
  onNewTagInputChange: (value: string) => void
  onAddTag: () => void
  onDragEnd: (event: DragEndEvent) => void
}

function SortableTag({
  tag,
  selectedTag,
  showTagManager,
  onTagSelect,
  onTagDelete,
}: {
  tag: Tag
  selectedTag: string
  showTagManager: boolean
  onTagSelect: (id: string) => void
  onTagDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id, disabled: !showTagManager })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative flex-shrink-0 group"
    >
      <Button
        variant={selectedTag === tag.id ? 'default' : 'outline'}
        onClick={() => !showTagManager && onTagSelect(tag.id)}
        size="sm"
        disabled={isDragging}
      >
        {tag.label}
      </Button>

      {showTagManager && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTagDelete(tag.id)
          }}
          className="absolute -top-2 -right-2 w-6 h-6 
                     bg-destructive text-destructive-foreground 
                     rounded-full flex items-center justify-center 
                     shadow-md opacity-0 group-hover:opacity-100 
                     hover:bg-destructive/90 transition-all z-20"
          aria-label={`删除 ${tag.label}`}
        >
          <X size={14} strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

export function TagManager({
  tags,
  selectedTag,
  showTagManager,
  newTagInput,
  isLoadingTags = false,
  onTagSelect,
  onTagDelete,
  onToggleManager,
  onRestoreDefaults,
  onNewTagInputChange,
  onAddTag,
  onDragEnd,
}: TagManagerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEndInternal = (event: DragEndEvent) => {
    setActiveId(null)
    onDragEnd(event)
  }

  const activeTag = tags.find((t) => t.id === activeId)

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onToggleManager}
          className="flex items-center gap-2"
        >
          <TagIcon className="size-4" />
          {showTagManager ? '完成编辑' : '管理标签'}
        </Button>

        {showTagManager && (
          <Button
            variant="ghost"
            onClick={onRestoreDefaults}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <RefreshCw className="size-4" />
            恢复默认
          </Button>
        )}
      </div>

      {showTagManager && (
        <div className="mb-4 flex gap-2">
          <Input
            type="text"
            value={newTagInput}
            onChange={(e) => onNewTagInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
            placeholder="输入自定义标签..."
            className="flex-1"
          />
          <Button onClick={onAddTag}>添加</Button>
        </div>
      )}

      {isLoadingTags ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <RefreshCw size={20} className="animate-spin" />
          <span>正在加载标签...</span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndInternal}
        >
          <div
            ref={scrollContainerRef}
            className="flex flex-wrap gap-2 w-full min-w-0 pt-3 pb-1 -mt-3"
          >
            <SortableContext
              items={tags.map((t) => t.id)}
              strategy={horizontalListSortingStrategy}
            >
              {tags.map((tag) => (
                <SortableTag
                  key={tag.id}
                  tag={tag}
                  selectedTag={selectedTag}
                  showTagManager={showTagManager}
                  onTagSelect={onTagSelect}
                  onTagDelete={onTagDelete}
                />
              ))}
            </SortableContext>
          </div>

          <DragOverlay>
            {activeId && activeTag && (
              <Button variant="outline" size="sm">
                {activeTag.label}
              </Button>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
