'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { IKPageContainer } from '@cdlab996/ui/IK'
import { logger } from '@cdlab996/utils'
import type { Quality, VideoCodec } from 'mediabunny'
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  canEncodeAudio,
  canEncodeVideo,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
} from 'mediabunny'
import { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import {
  CompressionSettings,
  ProcessingView,
  UploadArea,
} from '@/components/pages/compress'
import type { ConversionSettings } from '@/types'
import { defaultSettings } from '@/types'

const qualityMap: Record<ConversionSettings['quality'], Quality> = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  very_high: QUALITY_VERY_HIGH,
}

// Parse a bitrate string like '2500k' into bits per second
function parseBitrate(value: string): number {
  return Math.round(parseFloat(value) * 1000)
}

export default function Compress() {
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

  // Clean up URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (outputUrl) URL.revokeObjectURL(outputUrl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Compress video using mediabunny (WebCodecs)
  const compressVideo = async () => {
    if (!video) return

    setIsProcessing(true)
    setProgress(0)
    setProcessedSize(0)
    setError(null)

    try {
      logger.log('[Compress] start', {
        name: video.name,
        size: video.size,
        type: video.type,
        settings,
      })

      const input = new Input({
        source: new BlobSource(video),
        formats: ALL_FORMATS,
      })

      const videoTrack = await input.getPrimaryVideoTrack()
      logger.log('[Compress] input', {
        duration: await input.computeDuration(),
        codec: videoTrack?.codec ?? null,
        width: videoTrack?.displayWidth ?? null,
        height: videoTrack?.displayHeight ?? null,
      })

      // Resolve video codec, falling back to H.264 when the browser can't
      // hardware-encode the selected one.
      let codec: VideoCodec = settings.videoCodec
      if (!(await canEncodeVideo(codec))) {
        if (codec === 'hevc' && (await canEncodeVideo('avc'))) {
          codec = 'avc'
          toast.warning(
            'H.265 encoding is not supported here, using H.264 instead',
          )
        } else {
          throw new Error('This browser cannot encode the selected video codec')
        }
      }
      logger.log('[Compress] video codec resolved', codec)

      // Determine the target video bitrate (bits/sec) or quality preset
      let videoBitrate: number | Quality
      switch (settings.compressionMethod) {
        case 'bitrate':
          videoBitrate = parseBitrate(settings.videoBitrate)
          break
        case 'filesize': {
          const duration = await input.computeDuration()
          const targetBits =
            parseFloat(settings.targetFilesize || '100') * 8 * 1024 * 1024
          const audioBits = parseBitrate(settings.audioBitrate)
          videoBitrate = Math.max(
            100_000,
            Math.round(targetBits / Math.max(duration, 1)) - audioBits,
          )
          break
        }
        default:
          videoBitrate = qualityMap[settings.quality]
      }

      const videoOptions: {
        codec: VideoCodec
        bitrate: number | Quality
        height?: number
        frameRate?: number
      } = { codec, bitrate: videoBitrate }
      if (settings.resolution !== 'original') {
        videoOptions.height = Number(settings.resolution)
      }
      if (settings.frameRate !== 'original') {
        videoOptions.frameRate = Number(settings.frameRate)
      }
      logger.log('[Compress] video options', videoOptions)

      const canAac = await canEncodeAudio('aac')
      logger.log('[Compress] canEncodeAudio(aac)', canAac)
      if (!canAac) {
        toast.warning('Audio encoding is not supported here, output is muted')
      }

      const output = new Output({
        format: new Mp4OutputFormat(),
        target: new BufferTarget(),
      })

      const conversion = await Conversion.init({
        input,
        output,
        tracks: 'primary',
        video: videoOptions,
        audio: canAac
          ? { codec: 'aac', bitrate: parseBitrate(settings.audioBitrate) }
          : { discard: true },
      })
      logger.log('[Compress] conversion init', {
        discardedTracks: conversion.discardedTracks,
      })

      let lastLogged = -1
      conversion.onProgress = (ratio) => {
        const percent = Math.round(ratio * 100)
        setProgress(percent)
        // Throttle log output to once per percent
        if (percent !== lastLogged) {
          lastLogged = percent
          logger.log(`[Compress] progress ${percent}%`)
        }
      }

      logger.log('[Compress] execute start')
      await conversion.execute()
      logger.log('[Compress] execute done')

      const buffer = output.target.buffer
      if (!buffer) {
        throw new Error('Compression produced no output')
      }

      const blob = new Blob([buffer], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)

      setOutputUrl(url)
      setProgress(100)
      setProcessedSize(buffer.byteLength)
      logger.log('[Compress] complete', {
        originalSize: video.size,
        compressedSize: buffer.byteLength,
        ratio: (buffer.byteLength / video.size).toFixed(3),
      })
      toast.success('Video compressed successfully')
    } catch (err) {
      logger.error('[Compress] failed', err)
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
    onDrop: (acceptedFiles) => {
      resetState()
      setVideo(acceptedFiles[0])
      toast.info('Video file selected')
    },
  })

  return (
    <IKPageContainer scrollable={false}>
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
                isProcessing={isProcessing}
                outputUrl={outputUrl}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                isDragAccept={isDragAccept}
                isDragReject={isDragReject}
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
    </IKPageContainer>
  )
}
