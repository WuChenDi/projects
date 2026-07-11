import { useCallback, useEffect, useRef, useState } from 'react'
import { TIMELINE_CONSTANTS } from '@/editor/constants'
import { EditorCore } from '@/editor/core'
import { FADE_MAX_SECONDS } from '@/editor/lib/audio-fade'
import type { AudioClip } from '@/editor/types'

// Corner fade handles. Dragging the top-left handle right grows the fade-in;
// the top-right handle left grows the fade-out (0..5 s, capped at the clip
// length). Live value stays in local state during the drag and is committed as
// a single UpdateClipAudioCommand on release — one undo step per adjustment,
// matching the trim-handle pattern in use-clip-resize.

interface FadeDragState {
  side: 'in' | 'out'
  startX: number
  initial: number
}

export function useClipFade({
  clip,
  zoomLevel,
}: {
  clip: AudioClip
  zoomLevel: number
}) {
  const editor = EditorCore.getInstance()
  const [dragging, setDragging] = useState<FadeDragState | null>(null)
  const [fadeIn, setFadeIn] = useState(clip.fadeIn)
  const [fadeOut, setFadeOut] = useState(clip.fadeOut)
  const fadeRef = useRef({ fadeIn: clip.fadeIn, fadeOut: clip.fadeOut })

  const maxFade = Math.min(FADE_MAX_SECONDS, clip.duration)

  const handleFadeStart = useCallback(
    ({ event, side }: { event: React.MouseEvent; side: 'in' | 'out' }) => {
      event.stopPropagation()
      event.preventDefault()
      const initial = side === 'in' ? clip.fadeIn : clip.fadeOut
      setDragging({ side, startX: event.clientX, initial })
      setFadeIn(clip.fadeIn)
      setFadeOut(clip.fadeOut)
      fadeRef.current = { fadeIn: clip.fadeIn, fadeOut: clip.fadeOut }
    },
    [clip.fadeIn, clip.fadeOut],
  )

  useEffect(() => {
    if (!dragging) return

    const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel

    const onMove = ({ clientX }: MouseEvent) => {
      const deltaPx =
        dragging.side === 'in'
          ? clientX - dragging.startX
          : dragging.startX - clientX
      const next = Math.max(
        0,
        Math.min(maxFade, dragging.initial + deltaPx / pixelsPerSecond),
      )
      if (dragging.side === 'in') {
        fadeRef.current.fadeIn = next
        setFadeIn(next)
      } else {
        fadeRef.current.fadeOut = next
        setFadeOut(next)
      }
    }

    const onUp = () => {
      const value =
        dragging.side === 'in'
          ? fadeRef.current.fadeIn
          : fadeRef.current.fadeOut
      if (value !== dragging.initial) {
        editor.timeline.updateClipAudio({
          clipId: clip.id,
          patch:
            dragging.side === 'in' ? { fadeIn: value } : { fadeOut: value },
        })
      }
      setDragging(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging, zoomLevel, maxFade, editor.timeline, clip.id])

  // Keep the local mirror in sync when the clip changes externally (undo/redo).
  useEffect(() => {
    if (dragging) return
    setFadeIn(clip.fadeIn)
    setFadeOut(clip.fadeOut)
    fadeRef.current = { fadeIn: clip.fadeIn, fadeOut: clip.fadeOut }
  }, [dragging, clip.fadeIn, clip.fadeOut])

  return {
    isFading: dragging !== null,
    fadeIn: dragging ? fadeIn : clip.fadeIn,
    fadeOut: dragging ? fadeOut : clip.fadeOut,
    handleFadeStart,
  }
}
