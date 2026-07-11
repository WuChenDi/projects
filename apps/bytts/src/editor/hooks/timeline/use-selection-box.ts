import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TIMELINE_CONSTANTS, TRACK_GAP, TRACK_HEIGHT } from '@/editor/constants'
import { useEditor } from '@/editor/hooks/use-editor'
import type { ClipRef } from '@/editor/types'

// Marquee (box) selection over the track rows. Ported from bycut's
// use-selection-box, simplified to the audio row grid: no vertical scroll,
// track tops derived from the row stride.

const ROW_STRIDE = TRACK_HEIGHT + TRACK_GAP

interface Point {
  x: number
  y: number
}

interface SelectionBoxState {
  startPos: Point
  currentPos: Point
  isActive: boolean
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

interface UseSelectionBoxProps {
  rowsRef: RefObject<HTMLDivElement | null>
  tracksScrollRef: RefObject<HTMLDivElement | null>
  zoomLevel: number
  onSelectionComplete: (clips: ClipRef[]) => void
}

function normalize(a: Point, b: Point): Rect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  }
}

function intersects(a: Rect, b: Rect): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  )
}

export function useSelectionBox({
  rowsRef,
  tracksScrollRef,
  zoomLevel,
  onSelectionComplete,
}: UseSelectionBoxProps) {
  const editor = useEditor()
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState | null>(
    null,
  )
  const justSelectedRef = useRef(false)

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return
    setSelectionBox({
      startPos: { x: event.clientX, y: event.clientY },
      currentPos: { x: event.clientX, y: event.clientY },
      isActive: false,
    })
  }, [])

  const selectInBox = useCallback(
    ({ startPos, endPos }: { startPos: Point; endPos: Point }) => {
      const rows = rowsRef.current
      if (!rows) return

      const rect = rows.getBoundingClientRect()
      const scrollLeft = tracksScrollRef.current?.scrollLeft ?? 0
      const toContent = (p: Point): Point => ({
        x: p.x - rect.left + scrollLeft,
        y: p.y - rect.top,
      })
      const box = normalize(toContent(startPos), toContent(endPos))
      const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel

      const selected: ClipRef[] = []
      editor.timeline.getTracks().forEach((track, trackIndex) => {
        const top = trackIndex * ROW_STRIDE
        const bottom = top + TRACK_HEIGHT
        for (const clip of track.clips) {
          const left = clip.startTime * pixelsPerSecond
          const right = left + clip.duration * pixelsPerSecond
          if (intersects({ left, top, right, bottom }, box)) {
            selected.push({ trackId: track.id, clipId: clip.id })
          }
        }
      })

      onSelectionComplete(selected)
    },
    [rowsRef, tracksScrollRef, zoomLevel, editor, onSelectionComplete],
  )

  useEffect(() => {
    if (!selectionBox) return

    const onMove = (event: MouseEvent) => {
      const deltaX = Math.abs(event.clientX - selectionBox.startPos.x)
      const deltaY = Math.abs(event.clientY - selectionBox.startPos.y)
      const isActive = selectionBox.isActive || deltaX > 5 || deltaY > 5
      const next = {
        ...selectionBox,
        currentPos: { x: event.clientX, y: event.clientY },
        isActive,
      }
      setSelectionBox(next)
      if (isActive) {
        selectInBox({ startPos: next.startPos, endPos: next.currentPos })
      }
    }

    const onUp = () => {
      if (selectionBox.isActive) {
        justSelectedRef.current = true
        requestAnimationFrame(() => {
          justSelectedRef.current = false
        })
      }
      setSelectionBox(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [selectionBox, selectInBox])

  const shouldIgnoreClick = useCallback(() => justSelectedRef.current, [])

  return {
    selectionBox,
    handleMouseDown,
    isSelecting: selectionBox?.isActive ?? false,
    shouldIgnoreClick,
  }
}
