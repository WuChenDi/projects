/**
 * useInfiniteScroll - Custom hook for infinite scroll functionality
 * Manages intersection observer for prefetching and loading more content
 */

'use client'

import { useEffect, useRef } from 'react'

interface UseInfiniteScrollProps {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}

export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
}: UseInfiniteScrollProps) {
  const prefetchRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Keep latest callback without re-binding the observer each render.
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  })

  useEffect(() => {
    const target = prefetchRef.current
    if (!target || !hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMoreRef.current()
      },
      { threshold: 0.1, rootMargin: '200px' },
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [hasMore, loading])

  return { prefetchRef, loadMoreRef }
}
