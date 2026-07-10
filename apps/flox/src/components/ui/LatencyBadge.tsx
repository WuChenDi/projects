import { Badge } from '@cdlab/ui/components/badge'
import { memo, useMemo } from 'react'
import { getLatencyInfo } from '@/lib/utils/latency'

interface LatencyBadgeProps {
  latency: number
  className?: string
}

export const LatencyBadge = memo(function LatencyBadge({
  latency,
  className,
}: LatencyBadgeProps) {
  const info = useMemo(() => getLatencyInfo(latency), [latency])

  return (
    <Badge
      variant="outline"
      className={`text-[10px] ${className ?? ''}`}
      style={{
        backgroundColor: `${info.color}30`,
        borderColor: info.color,
        color: info.color,
      }}
      title={`Response time: ${info.label} (${info.level})`}
      aria-label={`Latency: ${info.label}`}
    >
      {info.label}
    </Badge>
  )
})
