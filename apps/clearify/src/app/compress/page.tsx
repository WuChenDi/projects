'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout'
import {
  CompressionSettings,
  ProcessingView,
  UploadArea,
} from '@/components/pages/compress'
import { logger } from '@/lib'
import type { ConversionSettings } from '@/types'
import { defaultSettings } from '@/types'

const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'

export default function Compress() {
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [video, setVideo] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [outputUrl, setOutputUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedSize, setProcessedSize] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [settings, setSettings] = useState<ConversionSettings>(defaultSettings)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  // Load FFmpeg with logging enabled
  const loadFFmpeg = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg()
      }

      const ffmpeg = ffmpegRef.current
      if (!ffmpeg.loaded) {
        ffmpeg.on('log', ({ type, message }) => {
          logger.log(`[FFmpeg Log] [${type}]`, message)
        })
        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            'text/javascript',
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            'application/wasm',
          ),
        })
        setIsReady(true)
        toast.success('Video processor loaded successfully')
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load video processor'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset component state
  const resetState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (outputUrl) URL.revokeObjectURL(outputUrl)
    setVideo(null)
    setProgress(0)
    setOutputUrl('')
    setIsProcessing(false)
    setProcessedSize(null)
    setPreviewUrl('')
    setSettings(defaultSettings)
    setError(null)
    if (videoRef.current) videoRef.current.src = ''
    if (previewRef.current) previewRef.current.src = ''
  }

  // Generate preview URL for selected video
  useEffect(() => {
    if (video) {
      const url = URL.createObjectURL(video)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [video])

  // Update preview video position based on compression progress
  useEffect(() => {
    if (previewRef.current && videoRef.current && isProcessing) {
      const duration = videoRef.current.duration
      if (duration) {
        previewRef.current.currentTime = (progress / 100) * duration
      }
    }
  }, [progress, isProcessing])

  // Compress video using FFmpeg
  const compressVideo = async () => {
    if (!video || !isReady || !ffmpegRef.current) return

    setIsProcessing(true)
    setProgress(0)
    setProcessedSize(0)
    setError(null)

    const ffmpeg = ffmpegRef.current

    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(video))
      ffmpeg.on('progress', ({ progress: ratio }) => {
        const percent = Math.round(ratio * 100)
        setProgress(percent)
        setProcessedSize(Math.min(video.size * ratio * 0.4, video.size * 0.4))
      })

      const args = ['-i', 'input.mp4', '-c:v', settings.videoCodec]
      switch (settings.compressionMethod) {
        case 'bitrate':
          args.push('-b:v', settings.videoBitrate)
          break
        case 'crf':
          args.push('-crf', settings.crfValue || '23')
          break
        case 'percentage':
          const crf = Math.round(
            51 - (parseInt(settings.targetPercentage || '100') / 100) * 33,
          )
          args.push('-crf', crf.toString())
          break
        case 'filesize':
          const targetBitrate = Math.round(
            (parseInt(settings.targetFilesize || '100') * 8192) /
              (videoRef.current?.duration || 60),
          )
          args.push('-b:v', `${targetBitrate}k`)
          break
      }
      args.push(
        '-c:a',
        settings.audioCodec,
        '-b:a',
        settings.audioBitrate,
        '-r',
        settings.frameRate,
        'output.mp4',
      )

      await ffmpeg.exec(args)
      const outputData = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)

      setOutputUrl(url)
      setProgress(100)
      setProcessedSize((outputData as Uint8Array).length)
      toast.success('Video compressed successfully')

      await ffmpeg.deleteFile('input.mp4')
      await ffmpeg.deleteFile('output.mp4')
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Compression failed'
      setError(errorMessage)
      toast.error(errorMessage)
      setProgress(0)
      setProcessedSize(null)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle setting change
  const handleSettingChange = (
    key: keyof ConversionSettings,
    value: string,
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Handle file drop using useDropzone
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    accept: {
      'video/*': [],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      resetState()
      setVideo(acceptedFiles[0])
      if (!isReady) await loadFFmpeg()
      toast.info('Video file selected')
    },
  })

  return (
    <PageContainer scrollable={false}>
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          {/* Left Panel - Upload & Settings */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Compress</CardTitle>
              <CardDescription>
                Compress videos in your browser by up to 90% for free. No upload
                required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UploadArea
                video={video}
                previewUrl={previewUrl}
                isLoading={isLoading}
                isProcessing={isProcessing}
                isReady={isReady}
                error={error}
                outputUrl={outputUrl}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                isDragAccept={isDragAccept}
                isDragReject={isDragReject}
                onRetryLoad={loadFFmpeg}
                onReset={resetState}
                onCompress={compressVideo}
              />

              <CompressionSettings
                settings={settings}
                onSettingChange={handleSettingChange}
              />
            </CardContent>
          </Card>

          {/* Right Panel - Video Preview & Results */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {video
                  ? 'Video preview and processing results'
                  : 'Upload a video to see preview'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessingView
                video={video}
                previewUrl={previewUrl}
                isProcessing={isProcessing}
                progress={progress}
                error={error}
                outputUrl={outputUrl}
                processedSize={processedSize}
                videoRef={videoRef}
                previewRef={previewRef}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
