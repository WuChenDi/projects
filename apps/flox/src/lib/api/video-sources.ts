/**
 * Video Source Configuration and Management
 * Handles third-party video API sources with validation and health checks
 */

import type { VideoSource } from '@/lib/types'
import { DEFAULT_SOURCES } from './default-sources'
import { PREMIUM_SOURCES } from './premium-sources'

/**
 * Get source by ID from both default and premium sources
 */
export function getSourceById(id: string): VideoSource | undefined {
  // Search in default sources first
  const defaultSource = DEFAULT_SOURCES.find((source) => source.id === id)
  if (defaultSource) {
    return defaultSource
  }

  // Search in premium sources
  return PREMIUM_SOURCES.find((source) => source.id === id)
}
