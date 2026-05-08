'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@cdlab996/ui/components/input-group'
import { Spinner } from '@cdlab996/ui/components/spinner'
import { cn } from '@cdlab996/ui/lib/utils'
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
        <Button
          variant="destructive"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation()
            onTagDelete(tag.id)
          }}
          className="absolute -top-2 -right-2 rounded-full"
          aria-label={`删除 ${tag.label}`}
        >
          <X className="size-3.5" />
        </Button>
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
  const DEFAULT_VISIBLE = 10
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

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
  // In management mode show all; otherwise respect expanded state
  const visibleTags =
    showTagManager || expanded ? tags : tags.slice(0, DEFAULT_VISIBLE)
  const hasMore = !showTagManager && tags.length > DEFAULT_VISIBLE

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={showTagManager ? undefined : onToggleManager}
          className={cn(
            'flex items-center gap-2',
            showTagManager && 'pointer-events-none',
          )}
        >
          <TagIcon className="size-4" />
          管理标签
        </Button>

        {showTagManager && (
          <div className="flex items-center gap-1">
            <Button variant="destructive" onClick={onRestoreDefaults}>
              <RefreshCw className="size-4" />
              恢复默认
            </Button>
            <Button variant="outline" onClick={onToggleManager}>
              完成编辑
            </Button>
          </div>
        )}
      </div>

      {showTagManager && (
        <div className="mb-4">
          <InputGroup>
            <InputGroupInput
              value={newTagInput}
              onChange={(e) => onNewTagInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
              placeholder="输入自定义标签..."
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton variant="default" onClick={onAddTag}>
                添加
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      )}

      {isLoadingTags ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Spinner className="size-5" />
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
              {visibleTags.map((tag) => (
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
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? '收起' : `+${tags.length - DEFAULT_VISIBLE} 更多`}
              </Button>
            )}
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
