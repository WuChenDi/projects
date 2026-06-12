'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@cdlab996/ui/lib/utils'

export interface ImageCompareProps {
  aspectRatio?: 'taller' | 'wider'
  /**
   * Fill the parent container's height instead of deriving it from the image
   * ratio. The parent must have a definite height. Pair with
   * `objectFit="contain"` to letterbox images without cropping or overflow.
   */
  fill?: boolean
  handle?: ReactNode
  hover?: boolean
  leftImage: string
  leftImageAlt?: string
  leftImageLabel?: ReactNode
  objectFit?: 'cover' | 'contain'
  onSliderPositionChange?: (position: number) => void
  rightImage: string
  rightImageAlt?: string
  rightImageLabel?: ReactNode
  skeleton?: ReactNode
  sliderPositionPercentage?: number
  vertical?: boolean
}

const HANDLE_SIZE = 40
const LINE_WIDTH = 2

// MUI-style elevation shared by the divider line and the default handle.
const ELEVATION =
  'shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0_rgba(0,0,0,0.14),0_1px_5px_0_rgba(0,0,0,0.12)]'

/** Returns the natural height/width ratio of an image element. */
function getImageRatio(image: HTMLImageElement): number {
  return image.naturalHeight / image.naturalWidth
}

/**
 * Calculates the container height from its width and two image ratios.
 * `taller` chooses the larger ratio, `wider` the smaller.
 */
function calculateContainerHeight(
  containerWidth: number,
  leftRatio: number,
  rightRatio: number,
  aspect: 'taller' | 'wider',
): number {
  const idealRatio =
    aspect === 'taller'
      ? Math.max(leftRatio, rightRatio)
      : Math.min(leftRatio, rightRatio)
  return containerWidth * idealRatio
}

/** Triggers a callback when the attached element's size changes. */
function useContainerSize(
  onResize: (size: { width: number; height: number }) => void,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        onResize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(element)
    // Initial call
    const rect = element.getBoundingClientRect()
    onResize({ width: rect.width, height: rect.height })

    return () => {
      observer.disconnect()
    }
  }, [onResize])

  return ref
}

export function ImageCompare(props: ImageCompareProps) {
  const {
    aspectRatio = 'taller',
    fill = false,
    handle = null,
    hover = false,
    leftImage,
    leftImageAlt = '',
    leftImageLabel = null,
    objectFit = 'cover',
    onSliderPositionChange,
    rightImage,
    rightImageAlt = '',
    rightImageLabel = null,
    skeleton = null,
    sliderPositionPercentage = 0.5,
    vertical = false,
  } = props

  const horizontal = !vertical

  // 0 to 1
  const [sliderPosition, setSliderPosition] = useState<number>(() =>
    Math.min(Math.max(sliderPositionPercentage, 0), 1),
  )
  const [isSliding, setIsSliding] = useState<boolean>(false)

  // Keep the latest callback in a ref so the pointer listeners always call
  // the current one without having to reattach on every render.
  const onSliderPositionChangeRef = useRef(onSliderPositionChange)
  onSliderPositionChangeRef.current = onSliderPositionChange

  // size of the parent container
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [containerHeight, setContainerHeight] = useState<number>(0)

  // refs to HTML elements. In fill mode the height tracks the parent container
  // rather than being derived from the image ratio.
  const handleContainerResize = useCallback(
    (size: { width: number; height: number }) => {
      setContainerWidth(size.width)
      if (fill) {
        setContainerHeight(size.height)
      }
    },
    [fill],
  )
  const containerRef = useContainerSize(handleContainerResize)
  const rightImageRef = useRef<HTMLImageElement>(null)
  const leftImageRef = useRef<HTMLImageElement>(null)

  // image loading flag
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const checkImagesLoaded = useCallback(() => {
    const left = leftImageRef.current
    const right = rightImageRef.current
    // Require a non-zero natural size: a `complete` image that failed to load
    // reports naturalWidth 0, which would later divide by zero in getImageRatio.
    if (
      left?.complete &&
      right?.complete &&
      left.naturalWidth > 0 &&
      right.naturalWidth > 0
    ) {
      setImagesLoaded(true)
    }
  }, [])

  // Manage image loading state. Reset whenever an image source changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the image sources change
  useEffect(() => {
    // Sometimes onLoad is not called (e.g. due to cache), so check explicitly.
    checkImagesLoaded()

    return () => {
      setImagesLoaded(false)
    }
  }, [leftImage, rightImage, checkImagesLoaded])

  // Set container height based on the image ratio (skipped in fill mode, where
  // the height instead follows the parent container).
  useEffect(() => {
    if (
      fill ||
      !(leftImageRef.current && rightImageRef.current) ||
      containerWidth === 0 ||
      !imagesLoaded
    ) {
      return
    }
    const height = calculateContainerHeight(
      containerWidth,
      getImageRatio(leftImageRef.current),
      getImageRatio(rightImageRef.current),
      aspectRatio,
    )
    setContainerHeight(height)
  }, [containerWidth, imagesLoaded, aspectRatio, fill])

  // Setup pointer (mouse/touch) event listeners. Reset whenever the
  // container size or any other relevant condition changes. The
  // onSliderPositionChange callback is read through a ref, so it never
  // needs to be a dependency here.
  useEffect(() => {
    // do nothing if refs are not ready, or images haven't loaded yet
    if (!containerRef.current || !imagesLoaded) {
      return
    }

    const containerElement = containerRef.current

    const stickSliderToPointer = (e: PointerEvent) => {
      // Get the cursor position from the edge of the container
      const rect = containerElement.getBoundingClientRect()
      const position = horizontal ? e.clientX - rect.left : e.clientY - rect.top

      // Clamp the slider position so it never overflows the container
      const halfLineWidth = LINE_WIDTH / 2
      const maxPosition = horizontal
        ? containerWidth - halfLineWidth
        : containerHeight - halfLineWidth
      const clampedPosition = Math.min(
        Math.max(position, halfLineWidth),
        maxPosition,
      )

      const ratio =
        clampedPosition / (horizontal ? containerWidth : containerHeight)

      setSliderPosition(ratio)
      onSliderPositionChangeRef.current?.(ratio)
    }

    const onStart = (e: PointerEvent) => {
      setIsSliding(true)
      e.preventDefault()

      // Use pointer capture to keep tracking the container being operated on.
      // It is automatically cleared on `pointerup` / `pointercancel`.
      containerElement.setPointerCapture(e.pointerId)

      // The very first move must be fired manually.
      stickSliderToPointer(e)
    }

    const onMove = (e: PointerEvent) => {
      const isTargetElement = containerElement.hasPointerCapture(e.pointerId)
      if (isTargetElement || hover) {
        stickSliderToPointer(e)
      }
    }

    const onFinish = () => {
      setIsSliding(false)
    }

    containerElement.addEventListener('pointerdown', onStart)
    containerElement.addEventListener('pointermove', onMove)
    containerElement.addEventListener('pointerup', onFinish)
    containerElement.addEventListener('pointercancel', onFinish)

    return () => {
      containerElement.removeEventListener('pointerdown', onStart)
      containerElement.removeEventListener('pointermove', onMove)
      containerElement.removeEventListener('pointerup', onFinish)
      containerElement.removeEventListener('pointercancel', onFinish)
    }
  }, [
    imagesLoaded,
    containerHeight,
    containerWidth,
    horizontal,
    hover,
    containerRef,
  ])

  // Clip regions for the overlay image and its label, driven by the slider.
  const leftClip = horizontal
    ? `inset(0 ${containerWidth * (1 - sliderPosition)}px 0 0)`
    : `inset(0 0 ${containerHeight * (1 - sliderPosition)}px 0)`
  const rightClip = horizontal
    ? `inset(0 0 0 ${containerWidth * sliderPosition}px)`
    : `inset(${containerHeight * sliderPosition}px 0 0 0)`

  const labelBase = cn(
    'absolute bg-black/50 px-5 py-2.5 text-white transition-opacity duration-100 ease-out',
    isSliding ? 'opacity-0' : 'opacity-100',
  )

  return (
    <>
      {skeleton && !imagesLoaded && (
        <div
          className="relative box-border w-full overflow-hidden"
          // Height is only known after the images load; until then let the
          // skeleton size itself instead of collapsing to 0.
          style={{ height: containerHeight || undefined }}
        >
          {skeleton}
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          'relative box-border w-full overflow-hidden',
          fill && 'h-full',
          horizontal ? 'touch-pan-y' : 'touch-pan-x',
          imagesLoaded ? 'block' : 'hidden',
        )}
        style={fill ? undefined : { height: containerHeight }}
      >
        {/* biome-ignore lint/performance/noImgElement: clip-path overlay with arbitrary URLs, next/image would not fit */}
        <img
          onLoad={() => checkImagesLoaded()}
          alt={rightImageAlt}
          ref={rightImageRef}
          src={rightImage}
          className={cn(
            'absolute block h-full w-full',
            objectFit === 'contain' ? 'object-contain' : 'object-cover',
          )}
          style={{ clipPath: rightClip }}
        />
        {/* biome-ignore lint/performance/noImgElement: clip-path overlay with arbitrary URLs, next/image would not fit */}
        <img
          onLoad={() => checkImagesLoaded()}
          alt={leftImageAlt}
          ref={leftImageRef}
          src={leftImage}
          className={cn(
            'absolute block h-full w-full',
            objectFit === 'contain' ? 'object-contain' : 'object-cover',
          )}
          style={{ clipPath: leftClip }}
        />
        <div
          className={cn(
            'absolute flex items-center justify-center',
            horizontal
              ? 'h-full w-10 cursor-ew-resize flex-col'
              : 'h-10 w-full cursor-ns-resize flex-row',
          )}
          style={
            horizontal
              ? {
                  left: containerWidth * sliderPosition - HANDLE_SIZE / 2,
                  top: 0,
                }
              : {
                  left: 0,
                  top: containerHeight * sliderPosition - HANDLE_SIZE / 2,
                }
          }
        >
          <div
            className={cn(
              'flex-[0_1_auto] bg-white',
              ELEVATION,
              horizontal ? 'h-full w-0.5' : 'h-0.5 w-full',
            )}
          />
          {/* biome-ignore lint/nursery/noMisusedPromises: handle is a ReactNode, not a Promise */}
          {handle ? (
            <div className="box-border flex h-auto w-auto flex-[1_0_auto] items-center justify-center">
              {handle}
            </div>
          ) : (
            <div
              className={cn(
                'box-border flex h-10 w-10 flex-[1_0_auto] items-center justify-center rounded-full border-2 border-white text-white',
                ELEVATION,
                !horizontal && 'rotate-90',
              )}
            >
              <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
              <ChevronRight size={16} strokeWidth={2.5} aria-hidden />
            </div>
          )}
          <div
            className={cn(
              'flex-[0_1_auto] bg-white',
              ELEVATION,
              horizontal ? 'h-full w-0.5' : 'h-0.5 w-full',
            )}
          />
        </div>
        {/* labels */}
        {leftImageLabel && (
          <div
            className="absolute h-full w-full"
            style={{ clipPath: leftClip }}
          >
            <div
              className={cn(
                labelBase,
                horizontal
                  ? 'left-[5%] top-1/2 -translate-y-1/2'
                  : 'left-1/2 top-[3%] -translate-x-1/2',
              )}
            >
              {leftImageLabel}
            </div>
          </div>
        )}
        {rightImageLabel && (
          <div
            className="absolute h-full w-full"
            style={{ clipPath: rightClip }}
          >
            <div
              className={cn(
                labelBase,
                horizontal
                  ? 'right-[5%] top-1/2 -translate-y-1/2'
                  : 'bottom-[3%] left-1/2 -translate-x-1/2',
              )}
            >
              {rightImageLabel}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
