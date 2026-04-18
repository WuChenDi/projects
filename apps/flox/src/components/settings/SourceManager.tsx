'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Switch } from '@cdlab996/ui/components/switch'
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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash } from 'lucide-react'
import { useState } from 'react'
import type { VideoSource } from '@/lib/types'

interface SourceManagerProps {
  sources: VideoSource[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onDragEnd: (event: DragEndEvent) => void
  onEdit?: (source: VideoSource) => void
  defaultIds: string[]
}

function SortableSourceItem({
  source,
  onToggle,
  onDelete,
  onEdit,
  isDefault,
}: {
  source: VideoSource
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit?: (source: VideoSource) => void
  isDefault: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: source.id })

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
      className="flex items-center justify-between px-4 py-3 bg-card/60 text-card-foreground gap-4 overflow-hidden rounded-xl text-sm"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

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
        {onEdit && !isDefault && (
          <Button size="icon" variant="ghost" onClick={() => onEdit(source)}>
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
  )
}

export function SourceManager({
  sources,
  onToggle,
  onDelete,
  onDragEnd,
  onEdit,
  defaultIds,
}: SourceManagerProps) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    onDragEnd(event)
  }

  const activeSource = sources.find((s) => s.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sources.map((s) => s.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sources.map((source) => (
            <SortableSourceItem
              key={source.id}
              source={source}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              isDefault={defaultIds.includes(source.id)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && activeSource && (
          <div className="flex items-center gap-3 px-4 py-3 bg-card text-card-foreground rounded-xl text-sm shadow-lg border">
            <GripVertical className="size-4 text-muted-foreground" />
            <div className="text-sm font-medium">{activeSource.name}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
