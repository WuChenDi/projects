import { ScrollArea } from '@cdlab996/ui/components/scroll-area'
import { cn } from '@cdlab996/ui/lib/utils'
import type React from 'react'

export function PageContainer({
  children,
  scrollable = true,
  className,
}: {
  children: React.ReactNode
  scrollable?: boolean
  className?: string
}) {
  return (
    <>
      {scrollable ? (
        <ScrollArea className="h-[calc(100dvh-80px)]">
          <main className={cn('flex flex-1 p-4 md:px-6 pt-0', className)}>
            {children}
          </main>
        </ScrollArea>
      ) : (
        <main className={cn('flex flex-1 p-4 md:px-6 pt-0', className)}>
          {children}
        </main>
      )}
    </>
  )
}
