import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
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
  const [tags, setTags] = useState<Tag[]>([])

  const queryClient = useQueryClient()

  const { data: fetchedTags, isLoading } = useQuery({
    queryKey,
    queryFn: fetchTags,
    staleTime,
    select: (data) => mergeWithSavedOrder(data, storageKey),
  })

  useEffect(() => {
    if (fetchedTags) setTags(fetchedTags)
  }, [fetchedTags])

  // Persist tag order to localStorage when it changes
  useEffect(() => {
    if (tags.length > 0 && !isLoading) {
      localStorage.setItem(storageKey, JSON.stringify(tags))
    }
  }, [tags, isLoading, storageKey])

  const { mutate: restoreDefaults, isPending: isRestoring } = useMutation({
    mutationFn: async () => {
      localStorage.removeItem(storageKey)
      return fetchTags()
    },
    onSuccess: (defaultTags) => {
      setTags(defaultTags)
      setSelectedTag(defaultSelectedTag)
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const handleAddTag = () => {
    if (!supportCustomTags || !newTagInput.trim()) return
    const newTag: Tag = {
      id: `custom_${Date.now()}`,
      label: newTagInput.trim(),
      value: newTagInput.trim(),
    }
    setTags((prev) => [...prev, newTag])
    setNewTagInput('')
  }

  const handleDeleteTag = (tagId: string) => {
    setTags((prev) => {
      const updated = prev.filter((t) => t.id !== tagId)
      if (selectedTag === tagId) {
        setSelectedTag(updated[0]?.id || defaultSelectedTag)
      }
      return updated
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setTags((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
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
