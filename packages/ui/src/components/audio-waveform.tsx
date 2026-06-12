'use client'

import * as React from 'react'

const PEAKS_PER_SECOND = 120
const MAX_BUCKETS = 6000

type Status = 'loading' | 'ready' | 'error'

export interface AudioWaveformProps {
  /** Audio URL to fetch and decode. Provide one of url / blob / audioBuffer / peaks. */
  audioUrl?: string
  /** Audio blob to decode. */
  blob?: Blob
  /** Already-decoded buffer — skips fetching/decoding. */
  audioBuffer?: AudioBuffer
  /** Pre-computed normalized peaks (each `0..1`). Skips decoding entirely. */
  peaks?: number[]
  /** Explicit width in CSS px — drives zoom in a timeline. Defaults to the container width. */
  width?: number
  /** Height in CSS px. */
  height: number
  /** Bar width in px. Default: 2. */
  barWidth?: number
  /** Gap between bars in px. Default: 1. */
  gap?: number
  /** Minimum bar height in px, so near-silence stays visible. Default: 2. */
  minBarHeight?: number
  /** Background fill. Default: `"transparent"`. */
  backgroundColor?: string
  /** Bar color. Default: `"rgb(184, 184, 184)"`. */
  barColor?: string
  /** Color for bars left of `progress`. Falls back to `barColor` when unset. */
  barPlayedColor?: string
  /** Played fraction `0..1`. Bars before it use `barPlayedColor`. */
  progress?: number
  /** Rounded bar caps. Default: `true`. */
  rounded?: boolean
  /** Called once with the normalized peaks after decoding. */
  onDecoded?: (peaks: number[]) => void
  className?: string
  style?: React.CSSProperties
}

/** Buckets a decoded buffer into normalized absolute-value peaks (`0..1`). */
function computePeaks(buffer: AudioBuffer, buckets: number): number[] {
  const channels = buffer.numberOfChannels
  const length = buffer.length
  const step = Math.max(1, Math.floor(length / buckets))
  const peaks: number[] = []
  let max = 0

  const channelData: Float32Array[] = []
  for (let c = 0; c < channels; c++) channelData.push(buffer.getChannelData(c))

  for (let i = 0; i < buckets; i++) {
    const start = i * step
    const end = Math.min(start + step, length)
    let peak = 0
    for (let c = 0; c < channels; c++) {
      const data = channelData[c]
      for (let j = start; j < end; j++) {
        const abs = Math.abs(data[j])
        if (abs > peak) peak = abs
      }
    }
    peaks.push(peak)
    if (peak > max) max = peak
  }

  if (max > 0) for (let i = 0; i < peaks.length; i++) peaks[i] /= max
  return peaks
}

export function AudioWaveform({
  audioUrl,
  blob,
  audioBuffer,
  peaks: peaksProp,
  width: widthProp,
  height,
  barWidth = 2,
  gap = 1,
  minBarHeight = 2,
  backgroundColor = 'transparent',
  barColor = 'rgb(184, 184, 184)',
  barPlayedColor,
  progress = 0,
  rounded = true,
  onDecoded,
  className,
  style,
}: AudioWaveformProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const onDecodedRef = React.useRef(onDecoded)
  onDecodedRef.current = onDecoded

  const [measuredWidth, setMeasuredWidth] = React.useState(widthProp ?? 0)
  const [peaks, setPeaks] = React.useState<number[]>(peaksProp ?? [])
  const [status, setStatus] = React.useState<Status>(
    peaksProp ? 'ready' : 'loading',
  )

  const width = widthProp ?? measuredWidth

  // Resolve width from the container when not given explicitly.
  React.useEffect(() => {
    if (widthProp !== undefined) return
    const el = containerRef.current
    if (!el) return
    setMeasuredWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setMeasuredWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [widthProp])

  // Decode the source into normalized peaks (once per source, independent of width).
  React.useEffect(() => {
    if (peaksProp) {
      setPeaks(peaksProp)
      setStatus('ready')
      return
    }

    let cancelled = false
    let audioContext: AudioContext | undefined
    setStatus('loading')

    const finish = (buffer: AudioBuffer) => {
      if (cancelled) return
      const buckets = Math.min(
        MAX_BUCKETS,
        Math.max(256, Math.round(buffer.duration * PEAKS_PER_SECOND)),
      )
      const computed = computePeaks(buffer, buckets)
      if (cancelled) return
      setPeaks(computed)
      setStatus('ready')
      onDecodedRef.current?.(computed)
    }

    const run = async () => {
      if (audioBuffer) {
        finish(audioBuffer)
        return
      }
      const arrayBuffer = blob
        ? await blob.arrayBuffer()
        : audioUrl
          ? await (await fetch(audioUrl)).arrayBuffer()
          : null
      if (!arrayBuffer) {
        setStatus('error')
        return
      }
      audioContext = new AudioContext()
      const decoded = await audioContext.decodeAudioData(arrayBuffer)
      finish(decoded)
    }

    run().catch(() => {
      if (!cancelled) setStatus('error')
    })

    return () => {
      cancelled = true
      void audioContext?.close()
    }
  }, [audioUrl, blob, audioBuffer, peaksProp])

  // Draw the bars, resampling the peaks to the current width.
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0 || peaks.length === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.ceil(width * dpr)
    canvas.height = Math.ceil(height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)
    }

    const stepX = barWidth + gap
    const barCount = Math.max(1, Math.floor(width / stepX))
    const mid = height / 2
    const radius = rounded ? barWidth / 2 : 0
    const played = barPlayedColor ?? barColor

    for (let i = 0; i < barCount; i++) {
      const peak = peaks[Math.floor((i / barCount) * peaks.length)] ?? 0
      const h = Math.max(minBarHeight, peak * height)
      const x = i * stepX
      const y = mid - h / 2
      ctx.fillStyle = i / barCount < progress ? played : barColor
      ctx.beginPath()
      if (radius > 0 && ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, h, radius)
        ctx.fill()
      } else {
        ctx.fillRect(x, y, barWidth, h)
      }
    }
  }, [
    peaks,
    width,
    height,
    barWidth,
    gap,
    minBarHeight,
    backgroundColor,
    barColor,
    barPlayedColor,
    progress,
    rounded,
  ])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: widthProp ?? '100%',
        height,
        ...style,
      }}
    >
      {status === 'error' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            opacity: 0.6,
          }}
        >
          Audio unavailable
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width,
            height,
            opacity: status === 'ready' ? 1 : 0,
            transition: 'opacity 150ms',
          }}
          aria-hidden
        />
      )}
    </div>
  )
}
