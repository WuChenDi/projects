import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useEffect, useState } from 'react'
import type { Tag } from '@/components/home/SortableTag'
import { PREMIUM_STORAGE_KEY } from '@/lib/constants/premium-tags'

export function usePremiumTagManager() {
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTag, setSelectedTag] = useState('recommend')
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const [justAddedTag, setJustAddedTag] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch tags from API
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true)
        // We need to send the enabled sources to the API
        // Dynamically import settingsStore to avoid initialization issues
        const { settingsStore } = await import('@/lib/store/settings-store')
        const settings = settingsStore.getSettings()
        const enabledSources = settings.premiumSources.filter((s) => s.enabled)

        const response = await fetch('/api/premium/types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sources: enabledSources,
          }),
        })

        const data = await response.json()

        if (data.tags && Array.isArray(data.tags)) {
          // Load saved order from local storage
          const savedTagsJson = localStorage.getItem(PREMIUM_STORAGE_KEY)
          if (savedTagsJson) {
            try {
              const savedTags = JSON.parse(savedTagsJson)
              // Merge API tags with saved order
              // 1. Keep saved tags that still exist in API
              // 2. Add new API tags to the end
              const apiTagMap = new Map<string, Tag>()
              if (Array.isArray(data.tags)) {
                data.tags.forEach((t: Tag) => apiTagMap.set(t.id, t))
              }

              const mergedTags: Tag[] = []
              const processedIds = new Set<string>()

              // Process saved tags
              if (Array.isArray(savedTags)) {
                savedTags.forEach((savedTag: Tag) => {
                  if (apiTagMap.has(savedTag.id)) {
                    mergedTags.push(apiTagMap.get(savedTag.id)!)
                    processedIds.add(savedTag.id)
                  }
                })
              }

              // Add remaining API tags
              data.tags.forEach((tag: Tag) => {
                if (!processedIds.has(tag.id)) {
                  mergedTags.push(tag)
                }
              })

              setTags(mergedTags)
            } catch (e) {
              console.error('Failed to parse saved tags', e)
              setTags(data.tags)
            }
          } else {
            setTags(data.tags)
          }
        }
      } catch (error) {
        console.error('Failed to fetch premium tags:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchTags()
  }, [])

  // Save tags to local storage whenever they change
  useEffect(() => {
    if (tags.length > 0 && !loading) {
      localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(tags))
    }
  }, [tags, loading])

  const handleAddTag = () => {
    // Custom tag adding is disabled for dynamic tags mode as we fetch all available tags
    // But we keep the function signature for compatibility
  }

  const handleDeleteTag = (tagId: string) => {
    // Instead of deleting, we could hide it, but for now let's just remove it from the list
    // It will reappear if local storage is cleared or if we implement a "hidden tags" feature
    // For now, simple removal from current view
    const newTags = tags.filter((t) => t.id !== tagId)
    setTags(newTags)

    if (selectedTag === tagId) {
      setSelectedTag(newTags[0]?.id || '')
    }
  }

  const handleRestoreDefaults = async () => {
    setLoading(true)
    localStorage.removeItem(PREMIUM_STORAGE_KEY)
    try {
      const response = await fetch('/api/premium/types')
      const data = await response.json()
      if (data.tags) {
        setTags(data.tags)
        setSelectedTag('recommend')
      }
    } catch (error) {
      console.error('Failed to restore tags:', error)
    } finally {
      setLoading(false)
    }
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
    loading,
    setSelectedTag,
    setNewTagInput,
    setShowTagManager,
    setJustAddedTag,
    handleAddTag,
    handleDeleteTag,
    handleRestoreDefaults,
    handleDragEnd,
  }
}
