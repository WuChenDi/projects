'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cdlab/ui/components/dialog'
import { Label } from '@cdlab/ui/components/label'
import { Slider } from '@cdlab/ui/components/slider'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useEditor } from '@/editor/hooks/use-editor'
import {
  DEFAULT_MIN_SILENCE_MS,
  DEFAULT_PADDING_MS,
  DEFAULT_SILENCE_THRESHOLD_DB,
} from '@/editor/lib/audio-silence'
import { detectClipSilence } from '@/editor/lib/silence'
import { useTimelineUiStore } from '@/editor/lib/timeline-ui-store'
import type { AudioClip, AudioTrack } from '@/editor/types'

// Silence-removal dialog. Detects silent gaps in the selected clip off-thread,
// previews them as an overlay on the clip, and applies them as one composite
// command (split + delete + ripple) so a single Ctrl+Z reverts the whole edit.

interface SilenceDialogProps {
  clip: AudioClip
  track: AudioTrack
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SilenceDialog({
  clip,
  track,
  open,
  onOpenChange,
}: SilenceDialogProps) {
  const editor = useEditor()
  const setSilencePreview = useTimelineUiStore(
    (state) => state.setSilencePreview,
  )
  const preview = useTimelineUiStore((state) => state.silencePreview)

  const [thresholdDb, setThresholdDb] = useState(DEFAULT_SILENCE_THRESHOLD_DB)
  const [minSilenceMs, setMinSilenceMs] = useState(DEFAULT_MIN_SILENCE_MS)
  const [paddingMs, setPaddingMs] = useState(DEFAULT_PADDING_MS)
  const [detecting, setDetecting] = useState(false)
  const [detected, setDetected] = useState(false)

  const previewRanges = preview?.clipId === clip.id ? preview.ranges : null

  const clearPreview = useCallback(() => {
    setSilencePreview(null)
    setDetected(false)
  }, [setSilencePreview])

  // Drop the overlay whenever the dialog closes.
  useEffect(() => {
    if (!open) clearPreview()
  }, [open, clearPreview])

  const asset = editor.media.getAsset({ id: clip.mediaId })

  const handleDetect = useCallback(async () => {
    if (!asset) {
      toast.error('找不到音频源')
      return
    }
    setDetecting(true)
    try {
      const ranges = await detectClipSilence({
        file: asset.file,
        trimStart: clip.trimStart,
        duration: clip.duration,
        options: {
          silenceThresholdDb: thresholdDb,
          minSilenceMs,
          paddingMs,
        },
      })
      setSilencePreview({ clipId: clip.id, ranges })
      setDetected(true)
      if (ranges.length === 0) toast.info('未检测到静音段')
    } catch (error) {
      console.error('Silence detection failed:', error)
      toast.error('静音检测失败，请重试')
    } finally {
      setDetecting(false)
    }
  }, [
    asset,
    clip.trimStart,
    clip.duration,
    clip.id,
    thresholdDb,
    minSilenceMs,
    paddingMs,
    setSilencePreview,
  ])

  const handleApply = useCallback(() => {
    if (!previewRanges || previewRanges.length === 0) return
    editor.timeline.removeSilence({
      trackId: track.id,
      clipId: clip.id,
      ranges: previewRanges,
    })
    clearPreview()
    onOpenChange(false)
  }, [
    previewRanges,
    editor.timeline,
    track.id,
    clip.id,
    clearPreview,
    onOpenChange,
  ])

  const removedSeconds =
    previewRanges?.reduce((sum, range) => sum + (range.end - range.start), 0) ??
    0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>移除静音</DialogTitle>
          <DialogDescription>
            检测片段中的静音段并一键删除，自动闭合空隙。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">静音阈值</Label>
              <span className="text-muted-foreground font-mono text-xs">
                {thresholdDb} dB
              </span>
            </div>
            <Slider
              min={-80}
              max={-20}
              step={1}
              value={[thresholdDb]}
              onValueChange={([value]) => {
                setThresholdDb(value)
                setDetected(false)
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">最短静音时长</Label>
              <span className="text-muted-foreground font-mono text-xs">
                {minSilenceMs} ms
              </span>
            </div>
            <Slider
              min={100}
              max={2000}
              step={50}
              value={[minSilenceMs]}
              onValueChange={([value]) => {
                setMinSilenceMs(value)
                setDetected(false)
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">保留边缘</Label>
              <span className="text-muted-foreground font-mono text-xs">
                {paddingMs} ms
              </span>
            </div>
            <Slider
              min={0}
              max={500}
              step={10}
              value={[paddingMs]}
              onValueChange={([value]) => {
                setPaddingMs(value)
                setDetected(false)
              }}
            />
          </div>

          {detected ? (
            <p className="text-muted-foreground text-xs">
              {previewRanges && previewRanges.length > 0
                ? `检测到 ${previewRanges.length} 段静音，共 ${removedSeconds.toFixed(1)} 秒`
                : '未检测到静音段'}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              void handleDetect()
            }}
            disabled={detecting}
          >
            {detecting ? '检测中…' : '检测'}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!previewRanges || previewRanges.length === 0}
          >
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
