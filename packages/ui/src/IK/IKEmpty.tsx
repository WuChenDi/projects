import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cdlab996/ui/components/empty'
import type { LucideIcon } from 'lucide-react'
import { Download } from 'lucide-react'
import type { ReactNode } from 'react'

interface IKEmptyProps {
  title: string
  description?: string
  hint?: string
  icon?: LucideIcon
  iconClassName?: string
  className?: string
  showIcon?: boolean
  children?: ReactNode
}

export function IKEmpty({
  title,
  description,
  hint,
  icon: Icon = Download,
  iconClassName = 'size-5',
  className = '',
  showIcon = true,
  children,
}: IKEmptyProps) {
  return (
    <Empty className={`flex-1 ${className}`}>
      {showIcon && (
        <EmptyMedia variant="icon">
          <Icon className={iconClassName} />
        </EmptyMedia>
      )}

      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>

      {hint && (
        <EmptyContent>
          <p className="text-xs text-muted-foreground/80">{hint}</p>
        </EmptyContent>
      )}

      {children}
    </Empty>
  )
}
