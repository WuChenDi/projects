import { TIMELINE_CONSTANTS } from '@/editor/constants'

// Timeline zoom math (ported from bycut lib/timeline/zoom-utils).

const PADDING_MAX_RATIO = 0.75
const PADDING_MIN_RATIO = 0.15
const PADDING_MIN_AT_ZOOM_PERCENT = 0.2
const ZOOM_TO_FIT_PADDING_RATIO = 0.05

export function getTimelineZoomMin({
  duration,
  containerWidth,
}: {
  duration: number
  containerWidth: number | null | undefined
}): number {
  const safeDuration = Math.max(duration, 1)
  const safeContainerWidth = containerWidth ?? 1000
  const contentRatioAtMinZoom = 1 - PADDING_MAX_RATIO
  const availableWidth = safeContainerWidth * contentRatioAtMinZoom
  const zoomToFit =
    availableWidth / (safeDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND)

  return Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, zoomToFit)
}

export function getZoomToFit({
  duration,
  containerWidth,
}: {
  duration: number
  containerWidth: number | null | undefined
}): number {
  const safeDuration = Math.max(duration, 1)
  const safeContainerWidth = containerWidth ?? 1000
  const availableWidth = safeContainerWidth * (1 - ZOOM_TO_FIT_PADDING_RATIO)
  const zoomToFit =
    availableWidth / (safeDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND)

  return Math.max(
    TIMELINE_CONSTANTS.ZOOM_MIN,
    Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, zoomToFit),
  )
}

export function getZoomPercent({
  zoomLevel,
  minZoom,
}: {
  zoomLevel: number
  minZoom: number
}): number {
  return (zoomLevel - minZoom) / (TIMELINE_CONSTANTS.ZOOM_MAX - minZoom)
}

export function getTimelinePaddingPx({
  containerWidth,
  zoomLevel,
  minZoom,
}: {
  containerWidth: number
  zoomLevel: number
  minZoom: number
}): number {
  const zoomPercent = getZoomPercent({ zoomLevel, minZoom })
  const paddingTransitionPercent = Math.min(
    zoomPercent / PADDING_MIN_AT_ZOOM_PERCENT,
    1,
  )
  const paddingRatio =
    PADDING_MAX_RATIO -
    (PADDING_MAX_RATIO - PADDING_MIN_RATIO) * paddingTransitionPercent

  return containerWidth * paddingRatio
}

/** Linear slider position (0-1) -> exponential zoom level. */
export function sliderToZoom({
  sliderPosition,
  minZoom,
  maxZoom = TIMELINE_CONSTANTS.ZOOM_MAX,
}: {
  sliderPosition: number
  minZoom: number
  maxZoom?: number
}): number {
  const clampedPosition = Math.max(0, Math.min(1, sliderPosition))
  return minZoom * (maxZoom / minZoom) ** clampedPosition
}

/** Exponential zoom level -> linear slider position (0-1). */
export function zoomToSlider({
  zoomLevel,
  minZoom,
  maxZoom = TIMELINE_CONSTANTS.ZOOM_MAX,
}: {
  zoomLevel: number
  minZoom: number
  maxZoom?: number
}): number {
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel))
  return Math.log(clampedZoom / minZoom) / Math.log(maxZoom / minZoom)
}
