'use client'

import { Button } from '@cdlab/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cdlab/ui/components/dialog'
import { Label } from '@cdlab/ui/components/label'
import { Progress } from '@cdlab/ui/components/progress'
import { RadioGroup, RadioGroupItem } from '@cdlab/ui/components/radio-group'
import { StatusEnum } from '@cdlab/ui/IK/IKAssetRenderer'
import { downloadFile } from '@cdlab/utils'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useEditor } from '@/editor/hooks/use-editor'
import type { ExportFormat } from '@/editor/lib/export-encode'
import type { AudioTrack, MediaAsset } from '@/editor/types'
import { genid } from '@/lib/genid'
import { useHistoryStore } from '@/store/useHistoryStore'

// Export entry point: mixes the timeline down to a stereo buffer, encodes it to
// the chosen format, saves it to history (survives reload via IndexedDB) and
// triggers a direct download. The mixdown + encoder modules are dynamically
// imported so the mp3 WASM chunk stays out of the editor bundle.

type ExportStatus = 'idle' | 'exporting' | 'done'

const FORMAT_OPTIONS: Array<{
  value: ExportFormat
  label: string
  hint: string
}> = [
  { value: 'mp3', label: 'MP3', hint: '体积更小，128 kbps' },
  { value: 'wav', label: 'WAV', hint: '无损，体积更大' },
]

export function ExportButton() {
  const editor = useEditor()
  const addHistory = useHistoryStore((state) => state.addHistory)
  const updateHistory = useHistoryStore((state) => state.updateHistory)

  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('mp3')
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)

  const hasClips = editor.timeline
    .getTracks()
    .some((track) => track.clips.length > 0)

  const handleOpenChange = (next: boolean) => {
    if (status === 'exporting') return
    setOpen(next)
    if (!next) {
      setStatus('idle')
      setProgress(0)
    }
  }

  const handleExport = async () => {
    const tracks = editor.timeline.getTracks()
    const mediaAssets = editor.media.getAssets()
    const totalDuration = editor.timeline.getTotalDuration()

    if (totalDuration <= 0) {
      toast.error('时间线为空，无法导出')
      return
    }

    setStatus('exporting')
    setProgress(0)

    try {
      const { renderTimelineMixdown } = await import(
        '@/editor/lib/export-mixdown'
      )
      const audioBuffer = await renderTimelineMixdown({
        tracks,
        mediaAssets,
        totalDuration,
        onProgress: (value) => setProgress(Math.round(value * 60)),
      })

      const { encodeAudioBuffer } = await import('@/editor/lib/export-encode')
      const blob = await encodeAudioBuffer({
        audioBuffer,
        format,
        onProgress: (value) => setProgress(60 + Math.round(value * 40)),
      })

      const baseName = `${deriveBaseName({ tracks, mediaAssets })}-edited`
      const extension = format === 'mp3' ? 'mp3' : 'wav'
      const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav'
      const id = String(genid.nextId())

      addHistory({
        id,
        name: baseName,
        timestamp: new Date().toLocaleString(),
        speaker: '时间线导出',
        text: '',
        requestInfo: `编辑器导出 · ${format.toUpperCase()}`,
        status: StatusEnum.COMPLETED,
      })
      // updateHistory persists the blob to IndexedDB so it survives reload.
      updateHistory(id, { audioBlob: new Blob([blob], { type: mimeType }) })

      downloadFile({ data: blob, filename: `${baseName}.${extension}` })

      setProgress(100)
      setStatus('done')
      toast.success('导出完成，已保存到历史记录')
    } catch (error) {
      console.error('Export failed:', error)
      setStatus('idle')
      setProgress(0)
      toast.error('导出失败，请重试')
    }
  }

  const isExporting = status === 'exporting'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={!hasClips}>
          <Download className="size-4" />
          导出
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导出音频</DialogTitle>
          <DialogDescription>
            将时间线混音导出，并保存到历史记录。
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={format}
          onValueChange={(value) => setFormat(value as ExportFormat)}
          className="grid grid-cols-2 gap-2"
        >
          {FORMAT_OPTIONS.map((option) => (
            <Label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                format === option.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value={option.value} disabled={isExporting} />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-muted-foreground text-xs">
                  {option.hint}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        {status !== 'idle' ? (
          <div className="flex flex-col gap-1.5">
            <Progress value={progress} />
            <span className="text-muted-foreground text-xs tabular-nums">
              {status === 'done' ? '已完成' : `导出中… ${progress}%`}
            </span>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            onClick={() => void handleExport()}
            disabled={isExporting || !hasClips}
          >
            {isExporting ? '导出中…' : '开始导出'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function deriveBaseName({
  tracks,
  mediaAssets,
}: {
  tracks: AudioTrack[]
  mediaAssets: MediaAsset[]
}): string {
  for (const track of tracks) {
    const clip = track.clips[0]
    if (clip?.name) return clip.name
  }
  return mediaAssets[0]?.name ?? '时间线'
}
