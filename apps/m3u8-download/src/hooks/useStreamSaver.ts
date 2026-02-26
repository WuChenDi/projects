'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib'
import { getStreamSaver, setupStreamSaver } from '@/lib/streamSaver'

export function useStreamSaver(middleTransporterUrl = '/mitm.html') {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const existing = getStreamSaver()
      if (existing) {
        setIsSupported(!existing.useBlobFallback)
        setIsLoaded(true)
        return
      }

      const config = setupStreamSaver(middleTransporterUrl)
      setIsSupported(!config.useBlobFallback)
      setIsLoaded(true)

      logger.log('StreamSaver Initialization completed:', {
        useBlobFallback: config.useBlobFallback,
        isSupported: !config.useBlobFallback,
      })
    } catch (error) {
      logger.error('Failed to setup StreamSaver:', error)
      setIsLoaded(true)
      setIsSupported(false)
    }
  }, [middleTransporterUrl])

  return {
    isLoaded,
    isSupported,
    streamSaver: isLoaded ? getStreamSaver() : null,
  }
}
