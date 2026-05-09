import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useTagOrdersStore } from '@/lib/store/tag-orders-store'
import type { Tag } from '@/lib/types'

interface UseTagManagerOptions {
  /** Scope identifier persisted under `flox:tag-orders`. e.g. `douban:movie`, `premium`. */
  scope: string
  /** react-query query key */
  queryKey: string[]
  /** Async function to fetch tags from API */
  fetchTags: () => Promise<Tag[]>
  /** Default selected tag id */
  defaultSelectedTag: string
  /** Whether user can add custom tags */
  supportCustomTags?: boolean
  /** react-query staleTime in ms */
  staleTime?: number
}

/**
 * Apply the user's saved order on top of the live API tag list:
 * - Saved entries that still exist in API → kept in saved order, with API data
 * - Saved entries no longer in API → kept as-is (covers user-added custom tags)
 * - New API entries → appended at the end
 */
function applySavedOrder(apiTags: Tag[], saved: Tag[] | undefined): Tag[] {
  if (!saved || saved.length === 0) return apiTags

  const apiMap = new Map(apiTags.map((t) => [t.id, t]))
  const merged: Tag[] = []
  const processed = new Set<string>()

  for (const s of saved) {
    merged.push(apiMap.get(s.id) ?? s)
    processed.add(s.id)
  }
  for (const t of apiTags) {
    if (!processed.has(t.id)) merged.push(t)
  }
  return merged
}

export function useTagManager({
  scope,
  queryKey,
  fetchTags,
  defaultSelectedTag,
  supportCustomTags = false,
  staleTime = 10 * 60 * 1000,
}: UseTagManagerOptions) {
  const [selectedTag, setSelectedTag] = useState(defaultSelectedTag)
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')

  const queryClient = useQueryClient()

  const { data: rawTags, isLoading } = useQuery({
    queryKey,
    queryFn: fetchTags,
    staleTime,
    placeholderData: keepPreviousData,
  })

  const savedOrder = useTagOrdersStore((s) => s.orders[scope])
  const setOrder = useTagOrdersStore((s) => s.setOrder)
  const clearOrder = useTagOrdersStore((s) => s.clearOrder)

  const tags = useMemo(
    () => (rawTags ? applySavedOrder(rawTags, savedOrder) : []),
    [rawTags, savedOrder],
  )

  const writeOrder = useCallback(
    (next: Tag[]) => setOrder(scope, next),
    [scope, setOrder],
  )

  const { mutate: restoreDefaults, isPending: isRestoring } = useMutation({
    mutationFn: async () => {
      clearOrder(scope)
      return fetchTags()
    },
    onSuccess: (defaultTags) => {
      queryClient.setQueryData(queryKey, defaultTags)
      setSelectedTag(defaultSelectedTag)
    },
  })

  const handleAddTag = () => {
    if (!supportCustomTags || !newTagInput.trim()) return
    const newTag: Tag = {
      id: `custom_${Date.now()}`,
      label: newTagInput.trim(),
      value: newTagInput.trim(),
    }
    writeOrder([...tags, newTag])
    setNewTagInput('')
  }

  const handleDeleteTag = (tagId: string) => {
    const updated = tags.filter((t) => t.id !== tagId)
    if (selectedTag === tagId) {
      setSelectedTag(updated[0]?.id || defaultSelectedTag)
    }
    writeOrder(updated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tags.findIndex((t) => t.id === active.id)
      const newIndex = tags.findIndex((t) => t.id === over.id)
      writeOrder(arrayMove(tags, oldIndex, newIndex))
    }
  }

  return {
    tags,
    selectedTag,
    newTagInput,
    showTagManager,
    isLoadingTags: isLoading || isRestoring,
    setSelectedTag,
    setNewTagInput,
    setShowTagManager,
    handleAddTag,
    handleDeleteTag,
    handleRestoreDefaults: restoreDefaults,
    handleDragEnd,
  }
}
