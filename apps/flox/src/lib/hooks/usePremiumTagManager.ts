import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Tag } from '@/components/home/SortableTag'
import { PREMIUM_STORAGE_KEY } from '@/lib/constants/premium-tags'
import { settingsStore } from '@/lib/store/settings-store'

async function fetchPremiumTypes(sources: any[]): Promise<Tag[]> {
  const response = await fetch('/api/premium/types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  })
  const data = await response.json()
  return Array.isArray(data.tags) ? data.tags : []
}

function mergeWithSavedOrder(apiTags: Tag[]): Tag[] {
  const savedJson = localStorage.getItem(PREMIUM_STORAGE_KEY)
  if (!savedJson) return apiTags

  try {
    const savedTags: Tag[] = JSON.parse(savedJson)
    const apiTagMap = new Map(apiTags.map((t) => [t.id, t]))
    const merged: Tag[] = []
    const processed = new Set<string>()

    savedTags.forEach((saved) => {
      if (apiTagMap.has(saved.id)) {
        merged.push(apiTagMap.get(saved.id)!)
        processed.add(saved.id)
      }
    })
    apiTags.forEach((tag) => {
      if (!processed.has(tag.id)) merged.push(tag)
    })
    return merged
  } catch {
    return apiTags
  }
}

export function usePremiumTagManager() {
  const [selectedTag, setSelectedTag] = useState('recommend')
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const [justAddedTag, setJustAddedTag] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])

  const queryClient = useQueryClient()
  const enabledSources = settingsStore.getSettings().premiumSources.filter((s) => s.enabled)
  const sourcesKey = enabledSources.map((s) => s.id).join(',')

  const { data: fetchedTags, isLoading } = useQuery({
    queryKey: ['premiumTypes', sourcesKey],
    queryFn: () => fetchPremiumTypes(enabledSources),
    staleTime: 10 * 60 * 1000,
    select: mergeWithSavedOrder,
  })

  useEffect(() => {
    if (fetchedTags) setTags(fetchedTags)
  }, [fetchedTags])

  // Persist tag order to localStorage when it changes
  useEffect(() => {
    if (tags.length > 0 && !isLoading) {
      localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(tags))
    }
  }, [tags, isLoading])

  const { mutate: restoreDefaults, isPending: isRestoring } = useMutation({
    mutationFn: async () => {
      localStorage.removeItem(PREMIUM_STORAGE_KEY)
      const response = await fetch('/api/premium/types')
      const data = await response.json()
      return Array.isArray(data.tags) ? (data.tags as Tag[]) : []
    },
    onSuccess: (defaultTags) => {
      setTags(defaultTags)
      setSelectedTag('recommend')
      queryClient.invalidateQueries({ queryKey: ['premiumTypes'] })
    },
  })

  const handleDeleteTag = (tagId: string) => {
    setTags((prev) => {
      const updated = prev.filter((t) => t.id !== tagId)
      if (selectedTag === tagId) setSelectedTag(updated[0]?.id || '')
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
    justAddedTag,
    loading: isLoading || isRestoring,
    setSelectedTag,
    setNewTagInput,
    setShowTagManager,
    setJustAddedTag,
    handleAddTag: () => {},
    handleDeleteTag,
    handleRestoreDefaults: restoreDefaults,
    handleDragEnd,
  }
}
