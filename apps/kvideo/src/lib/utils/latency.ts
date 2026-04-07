/**
 * Latency utilities for displaying response times
 * Following Liquid Glass design system principles
 */

interface LatencyInfo {
  value: number
  label: string
  color: string
  level: 'excellent' | 'good' | 'fair' | 'slow'
}

/**
 * Get latency information with color coding
 * @param latency - Response time in milliseconds
 * @returns Formatted latency info with color and level
 */
export function getLatencyInfo(latency: number): LatencyInfo {
  let level: LatencyInfo['level']
  let color: string

  if (latency < 500) {
    level = 'excellent'
    color = '#34c759' // Green
  } else if (latency < 1000) {
    level = 'good'
    color = '#30d158' // Light green
  } else if (latency < 2000) {
    level = 'fair'
    color = '#ff9500' // Orange
  } else {
    level = 'slow'
    color = '#ff3b30' // Red
  }

  return {
    value: latency,
    label: formatLatency(latency),
    color,
    level,
  }
}

/**
 * Format latency for display
 * @param latency - Response time in milliseconds
 * @returns Formatted string in milliseconds (e.g., "345ms", "1240ms")
 */
function formatLatency(latency: number): string {
  return `${latency}ms`
}
