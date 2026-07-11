import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorCore } from '@/editor/core'
import { fractionToGainDb, gainDbToFraction } from '@/editor/lib/audio-gain'
import type { AudioClip } from '@/editor/types'

// Draggable per-clip volume line. Vertical position maps to gain in dB
// (top = +12, bottom = -60). Live value stays local during the drag and is
// committed as one UpdateClipAudioCommand on release (single undo step).

interface GainDragState {
  startY: number
  initialDb: number
}

export function useClipGain({
  clip,
  bodyHeight,
}: {
  clip: AudioClip
  bodyHeight: number
}) {
  const editor = EditorCore.getInstance()
  const [dragging, setDragging] = useState<GainDragState | null>(null)
  const [gainDb, setGainDb] = useState(clip.gainDb)
  const gainRef = useRef(clip.gainDb)

  const handleGainStart = useCallback(
    ({ event }: { event: React.MouseEvent }) => {
      event.stopPropagation()
      event.preventDefault()
      setDragging({ startY: event.clientY, initialDb: clip.gainDb })
      setGainDb(clip.gainDb)
      gainRef.current = clip.gainDb
    },
    [clip.gainDb],
  )

  useEffect(() => {
    if (!dragging) return

    const height = Math.max(1, bodyHeight)

    const onMove = ({ clientY }: MouseEvent) => {
      const deltaFraction = (clientY - dragging.startY) / height
      const nextFraction = gainDbToFraction(dragging.initialDb) + deltaFraction
      const next = fractionToGainDb(nextFraction)
      gainRef.current = next
      setGainDb(next)
    }

    const onUp = () => {
      if (gainRef.current !== dragging.initialDb) {
        editor.timeline.updateClipAudio({
          clipId: clip.id,
          patch: { gainDb: gainRef.current },
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
  }, [dragging, bodyHeight, editor.timeline, clip.id])

  useEffect(() => {
    if (dragging) return
    setGainDb(clip.gainDb)
    gainRef.current = clip.gainDb
  }, [dragging, clip.gainDb])

  return {
    isAdjustingGain: dragging !== null,
    gainDb: dragging ? gainDb : clip.gainDb,
    handleGainStart,
  }
}
