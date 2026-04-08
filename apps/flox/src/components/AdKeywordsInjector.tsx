'use client'

import { useEffect, useRef } from 'react'
import { usePlayerSettings } from '@/components/player/hooks/usePlayerSettings'

interface AdKeywordsInjectorProps {
  keywords: string[]
}

export function AdKeywordsInjector({ keywords }: AdKeywordsInjectorProps) {
  const { setAdKeywords } = usePlayerSettings()
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && keywords.length > 0) {
      setAdKeywords(keywords)
      initialized.current = true
    }
  }, [keywords, setAdKeywords])

  return null
}
