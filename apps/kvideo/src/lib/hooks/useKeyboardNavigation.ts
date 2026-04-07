/**
 * useKeyboardNavigation Hook
 * Provides arrow key navigation for lists and grids
 */

import type { RefObject } from 'react'
import { useCallback, useEffect } from 'react'

interface UseKeyboardNavigationOptions {
  enabled: boolean
  containerRef: RefObject<HTMLElement | null>
  onNavigate?: (index: number) => void
  onSelect?: (index: number) => void
  onEscape?: () => void
  currentIndex?: number
  itemCount: number
  orientation?: 'horizontal' | 'vertical' | 'grid'
  columns?: number // For grid layouts
}

export function useKeyboardNavigation({
  enabled,
  containerRef,
  onNavigate,
  onSelect,
  onEscape,
  currentIndex = -1,
  itemCount,
  orientation = 'vertical',
  columns = 1,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || itemCount === 0) return

      let newIndex = currentIndex
      let handled = false

      switch (event.key) {
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'grid') {
            event.preventDefault()
            newIndex =
              orientation === 'grid'
                ? Math.min(currentIndex + columns, itemCount - 1)
                : Math.min(currentIndex + 1, itemCount - 1)
            handled = true
          }
          break

        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'grid') {
            event.preventDefault()
            newIndex =
              orientation === 'grid'
                ? Math.max(currentIndex - columns, 0)
                : Math.max(currentIndex - 1, 0)
            handled = true
          }
          break

        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'grid') {
            event.preventDefault()
            newIndex = Math.min(currentIndex + 1, itemCount - 1)
            handled = true
          }
          break

        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'grid') {
            event.preventDefault()
            newIndex = Math.max(currentIndex - 1, 0)
            handled = true
          }
          break

        case 'Home':
          event.preventDefault()
          newIndex = 0
          handled = true
          break

        case 'End':
          event.preventDefault()
          newIndex = itemCount - 1
          handled = true
          break

        case 'Enter':
        case ' ':
          if (currentIndex >= 0 && onSelect) {
            event.preventDefault()
            onSelect(currentIndex)
            handled = true
          }
          break

        case 'Escape':
          if (onEscape) {
            event.preventDefault()
            onEscape()
            handled = true
          }
          break
      }

      if (handled && newIndex !== currentIndex && onNavigate) {
        onNavigate(newIndex)
      }
    },
    [
      enabled,
      itemCount,
      currentIndex,
      orientation,
      columns,
      onNavigate,
      onSelect,
      onEscape,
    ],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, enabled, handleKeyDown])
}
