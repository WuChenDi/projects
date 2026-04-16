'use client'

import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { ChevronUpIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]')
    if (!viewport) return

    const toggleVisibility = () => {
      setIsVisible(viewport.scrollTop > 300)
    }

    viewport.addEventListener('scroll', toggleVisibility, { passive: true })
    toggleVisibility()

    return () => viewport.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]')
    viewport?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={scrollToTop}
      aria-label="返回顶部"
      title="返回顶部"
      className={cn(
        'fixed bottom-8 right-8 rounded-full transition-all duration-300',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-10 pointer-events-none',
      )}
    >
      <ChevronUpIcon className="size-4" />
    </Button>
  )
}
