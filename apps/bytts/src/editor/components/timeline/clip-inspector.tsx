'use client'

import { Button } from '@cdlab/ui/components/button'
import { Label } from '@cdlab/ui/components/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cdlab/ui/components/popover'
import { Slider } from '@cdlab/ui/components/slider'
import { AudioLines, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EditorCore } from '@/editor/core'
import { FADE_MAX_SECONDS } from '@/editor/lib/audio-fade'
import { formatGainDb, GAIN_DB_MAX, GAIN_DB_MIN } from '@/editor/lib/audio-gain'
import type { AudioClip, AudioTrack } from '@/editor/types'
import { SilenceDialog } from './silence-dialog'

// Per-clip audio inspector: a popover with gain (−60…+12 dB), fade-in and
// fade-out (0…5 s) sliders plus the silence-removal entry point. Slider drags
// update a local mirror for a live label and commit once on release
// (onValueCommit → one undo step).

interface ClipInspectorProps {
  clip: AudioClip
  track: AudioTrack
}

export function ClipInspector({ clip, track }: ClipInspectorProps) {
  const editor = EditorCore.getInstance()
  const [gainDb, setGainDb] = useState(clip.gainDb)
  const [fadeIn, setFadeIn] = useState(clip.fadeIn)
  const [fadeOut, setFadeOut] = useState(clip.fadeOut)
  const [silenceOpen, setSilenceOpen] = useState(false)

  // Resync the mirrors when the clip changes externally (undo/redo, line drag).
  useEffect(() => {
    setGainDb(clip.gainDb)
  }, [clip.gainDb])
  useEffect(() => {
    setFadeIn(clip.fadeIn)
  }, [clip.fadeIn])
  useEffect(() => {
    setFadeOut(clip.fadeOut)
  }, [clip.fadeOut])

  const maxFade = Math.min(FADE_MAX_SECONDS, clip.duration)

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="片段音频设置"
            title="音频设置"
            className="bg-background/70 text-foreground hover:bg-background absolute top-0.5 right-0.5 z-50 flex size-4 items-center justify-center rounded-sm"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <SlidersHorizontal className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64"
          align="start"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">音量</Label>
                <span className="text-muted-foreground font-mono text-xs">
                  {formatGainDb(gainDb)}
                </span>
              </div>
              <Slider
                min={GAIN_DB_MIN}
                max={GAIN_DB_MAX}
                step={1}
                value={[gainDb]}
                onValueChange={([value]) => setGainDb(value)}
                onValueCommit={([value]) =>
                  editor.timeline.updateClipAudio({
                    clipId: clip.id,
                    patch: { gainDb: value },
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">淡入</Label>
                <span className="text-muted-foreground font-mono text-xs">
                  {fadeIn.toFixed(2)} s
                </span>
              </div>
              <Slider
                min={0}
                max={maxFade}
                step={0.05}
                value={[Math.min(fadeIn, maxFade)]}
                onValueChange={([value]) => setFadeIn(value)}
                onValueCommit={([value]) =>
                  editor.timeline.updateClipAudio({
                    clipId: clip.id,
                    patch: { fadeIn: value },
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">淡出</Label>
                <span className="text-muted-foreground font-mono text-xs">
                  {fadeOut.toFixed(2)} s
                </span>
              </div>
              <Slider
                min={0}
                max={maxFade}
                step={0.05}
                value={[Math.min(fadeOut, maxFade)]}
                onValueChange={([value]) => setFadeOut(value)}
                onValueCommit={([value]) =>
                  editor.timeline.updateClipAudio({
                    clipId: clip.id,
                    patch: { fadeOut: value },
                  })
                }
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSilenceOpen(true)}
            >
              <AudioLines className="size-4" />
              移除静音
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <SilenceDialog
        clip={clip}
        track={track}
        open={silenceOpen}
        onOpenChange={setSilenceOpen}
      />
    </>
  )
}
