/**
 * Form hook for AddSourceModal
 */

'use client'

import { useEffect, useState } from 'react'
import type { VideoSource } from '@/lib/types'

interface UseAddSourceFormProps {
  isOpen: boolean
  existingIds: string[]
  onAdd: (source: VideoSource) => void
  onClose: () => void
  initialValues?: VideoSource | null
}

export function useAddSourceForm({
  isOpen,
  existingIds,
  onAdd,
  onClose,
  initialValues,
}: UseAddSourceFormProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        setName(initialValues.name)
        setUrl(initialValues.baseUrl)
      } else {
        setName('')
        setUrl('')
      }
      setError('')
    }
  }, [isOpen, initialValues])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !url.trim()) {
      setError('请填写所有字段')
      return
    }

    try {
      new URL(url)
    } catch {
      setError('请输入有效的 URL')
      return
    }

    let id = initialValues?.id

    // Only generate new ID if not editing or if name changed (optional, maybe keep ID stable?)
    // For now, let's keep ID stable if editing, unless we want to allow re-generating ID.
    // But if we re-generate ID, we lose history/preferences for that ID.
    // So better to keep ID if editing.
    if (!id) {
      id = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      if (existingIds.includes(id)) {
        setError('此源名称已存在')
        return
      }
    }

    const newSource: VideoSource = {
      id,
      name: name.trim(),
      baseUrl: url.trim(),
      searchPath: initialValues?.searchPath || '',
      detailPath: initialValues?.detailPath || '',
      enabled: initialValues?.enabled ?? true,
      priority: initialValues?.priority || existingIds.length + 1,
    }

    onAdd(newSource)
    onClose()
  }

  return {
    name,
    setName,
    url,
    setUrl,
    error,
    handleSubmit,
  }
}
