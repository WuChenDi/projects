'use client'

import { cn } from '@cdlab/ui/lib/utils'
import { Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

// Local audio intake: drag-and-drop or click-to-browse. Accepts the formats
// AudioContext.decodeAudioData can handle in-browser (mp3/wav/m4a/ogg).

const ACCEPTED_AUDIO = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  'audio/ogg': ['.ogg'],
}

interface MediaDropzoneProps {
  onFiles: (files: File[]) => void
}

export function MediaDropzone({ onFiles }: MediaDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_AUDIO,
    onDrop: (accepted) => {
      if (accepted.length > 0) onFiles(accepted)
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5 text-primary'
          : 'text-muted-foreground hover:border-primary/60',
      )}
    >
      <input {...getInputProps()} />
      <Upload className="size-3.5 shrink-0" />
      <span>拖入或点击添加本地音频（mp3/wav/m4a/ogg）</span>
    </div>
  )
}
