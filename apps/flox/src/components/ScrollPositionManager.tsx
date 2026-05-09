'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/settings-store'

/**
 * ScrollPositionManager - Maintains scroll position across navigation and refreshes
 * Uses sessionStorage to persist scroll state per URL
 */
export function ScrollPositionManager() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Create a unique key for the current page including search params
  const getPageKey = useCallback(() => {
    const params = searchParams.toString()
    return `scroll-pos:${pathname}${params ? '?' + params : ''}`
  }, [pathname, searchParams])

  // Restoration logic
  useEffect(() => {
    if (!useSettingsStore.getState().rememberScrollPosition) return

    const key = getPageKey()
    const savedPos = sessionStorage.getItem(key)

    if (savedPos) {
      const position = parseInt(savedPos, 10)
      if (!isNaN(position) && position > 0) {
        // We use multiple attempts to restore scroll because content might be loading dynamically
        // (e.g., search results, movie grids)

        // Keep trying until we actually scroll there or a timeout occurs
        let attempts = 0
        const maxAttempts = 10

        const tryScroll = () => {
          const currentScroll = window.scrollY
          window.scrollTo(0, position)
          attempts++

          // Verify if we actually reached the target position (with some wiggle room)
          const reached = Math.abs(window.scrollY - position) < 10

          if (!reached && attempts < maxAttempts) {
            // If we didn't reach it, it's likely because the page height hasn't caught up yet
            setTimeout(tryScroll, 200)
          }
        }

        const timerId = setTimeout(tryScroll, 100)
        return () => clearTimeout(timerId)
      }
    }
  }, [getPageKey]) // Run on navigation

  // Saving logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      if (!useSettingsStore.getState().rememberScrollPosition) return

      // Debounce saving to avoid excessive writes to sessionStorage
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const key = getPageKey()
        // Only save if we have scrolled
        if (window.scrollY > 0) {
          sessionStorage.setItem(key, window.scrollY.toString())
        } else {
          sessionStorage.removeItem(key)
        }
      }, 500)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [getPageKey])

  return null
}
