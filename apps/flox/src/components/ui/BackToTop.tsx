'use client'

import { ChevronUpIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true })
    toggleVisibility()

    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 z-[9999] p-3 rounded-full
                  bg-background/95 border border-border
                  shadow-md backdrop-blur-xl
                  text-foreground transition-all duration-300 ease-out
                  hover:bg-primary/15
                  hover:scale-110 active:scale-95
                  ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'}`}
      aria-label="返回顶部"
      title="返回顶部"
    >
      <ChevronUpIcon size={24} strokeWidth={2.5} />
    </button>
  )
}
