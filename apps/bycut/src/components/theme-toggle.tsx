'use client'

import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

interface ThemeToggleProps {
  className?: string
  iconClassName?: string
  onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export function ThemeToggle({
  className,
  iconClassName,
  onToggle,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn('size-8', className)}
      onClick={(e) => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
        onToggle?.(e)
      }}
    >
      <Sun
        className={cn('!size-[1.1rem]', iconClassName)}
      />
      <span className="sr-only">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </Button>
  )
}
