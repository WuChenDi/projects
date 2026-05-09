import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import type { Tag } from '@/lib/types'

interface UseTagManagerOptions {
  /** Unique key for react-query and localStorage */
  storageKey: string
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
 * Merge API tags with saved localStorage order.
 * Preserves user's custom ordering while picking up new tags from API.
 */
function mergeWithSavedOrder(apiTags: Tag[], storageKey: string): Tag[] {
  if (typeof window === 'undefined') return apiTags
  const savedJson = localStorage.getItem(storageKey)
  if (!savedJson) return apiTags

  try {
    const savedTags: Tag[] = JSON.parse(savedJson)
    const apiTagMap = new Map(apiTags.map((t) => [t.id, t]))
    const merged: Tag[] = []
    const processed = new Set<string>()

    // First: tags in saved order (that still exist in API)
    for (const saved of savedTags) {
      if (apiTagMap.has(saved.id)) {
        merged.push(apiTagMap.get(saved.id)!)
        processed.add(saved.id)
      } else {
        // Keep custom tags that aren't from API
        merged.push(saved)
        processed.add(saved.id)
      }
    }
    // Then: new tags from API not yet in saved order
    for (const tag of apiTags) {
      if (!processed.has(tag.id)) merged.push(tag)
    }
    return merged
  } catch {
    return apiTags
  }
}

export function useTagManager({
  storageKey,
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

  // Merge API tags with the storageKey-specific saved order on every render.
  // Cheap (O(n)) and always reflects the current storageKey, so switching
  // contentType immediately shows the right tags without a sync useEffect.
  const tags = useMemo(
    () => (rawTags ? mergeWithSavedOrder(rawTags, storageKey) : []),
    [rawTags, storageKey],
  )

  const writeOrder = useCallback(
    (next: Tag[]) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(next))
      }
      // Push the user-modified list into the cache so the UI re-renders
      // and future reads stay consistent.
      queryClient.setQueryData(queryKey, next)
    },
    [storageKey, queryClient, queryKey],
  )

  const { mutate: restoreDefaults, isPending: isRestoring } = useMutation({
    mutationFn: async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey)
      }
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
      const oldIndex = tags.findIndex((item) => item.id === active.id)
      const newIndex = tags.findIndex((item) => item.id === over.id)
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
