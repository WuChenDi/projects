'use client'

import * as React from 'react'
import { cn } from '@cdlab/ui/lib/utils'

// The line and fill are drawn in this fixed coordinate space and scaled to the
// container through the SVG viewBox. The interactive overlays (cursor, dot,
// tooltip) are HTML positioned with percentages of the same box, so they track
// the data while keeping a constant on-screen size regardless of chart width.
const VIEW_W = 640
const VIEW_H = 220
const PAD_TOP = 24
const PAD_BOTTOM = 12
const STROKE_WIDTH = 2.2
const CORNER_RADIUS = 2.5
const CURSOR_WIDTH = 2
const DOT_SIZE = 12
const TOOLTIP_GAP = 12

const TRANSITION = '200ms cubic-bezier(0.16, 1, 0.3, 1)'
const DOT_SHADOW = '0 0 0 2px #fff, 0 0 8px 2px rgba(0, 0, 0, 0.12)'

interface Point {
  value: number
  index: number
  x: number
  y: number
}

/** A smooth polyline through `points`, rounding each interior corner. */
function roundedLinePath(points: Point[], radius: number): string {
  const f = (n: number) => n.toFixed(3)
  if (points.length === 0) return ''
  if (points.length === 1) return `M${f(points[0].x)} ${f(points[0].y)}`

  let d = `M${f(points[0].x)} ${f(points[0].y)}`
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y) || 1
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y) || 1
    const r = Math.min(radius, inLen / 2, outLen / 2)
    const bx = curr.x - ((curr.x - prev.x) / inLen) * r
    const by = curr.y - ((curr.y - prev.y) / inLen) * r
    const ax = curr.x + ((next.x - curr.x) / outLen) * r
    const ay = curr.y + ((next.y - curr.y) / outLen) * r
    d += ` L${f(bx)} ${f(by)} Q${f(curr.x)} ${f(curr.y)} ${f(ax)} ${f(ay)}`
  }
  const last = points[points.length - 1]
  return `${d} L${f(last.x)} ${f(last.y)}`
}

export interface SparkChartProps {
  /** Numeric values to plot, left to right. */
  data: number[]
  /** Optional label per point, shown atop the tooltip and along the X axis. */
  labels?: string[]
  /** Series name shown next to the value in the tooltip. */
  name?: string
  /** Line, dot, and tooltip swatch color (any CSS color). Defaults to `#0090fd`. */
  color?: string
  /** Maximum width in px. The chart keeps a 640:220 aspect ratio. Defaults to `640`. */
  width?: number
  /** Format the tooltip value. Receives the value and its index. */
  formatValue?: (value: number, index: number) => React.ReactNode
  /** Show X-axis tick labels. Requires `labels`. Defaults to `true`. */
  showXAxis?: boolean
  /** Target number of X-axis ticks. Defaults to `6`. */
  tickCount?: number
  /** Color the line only up to the cursor (gray before it). Defaults to `false`. */
  reveal?: boolean
  /** Show the gradient fill under the line. Defaults to `true`. */
  showFill?: boolean
  /** Show the dot at the active point. Defaults to `true`. */
  showDot?: boolean
  /** Animate the cursor, dot, and tooltip on hover. Defaults to `true`. */
  animated?: boolean
  /** Extra classes on the root element. */
  className?: string
}

export function SparkChart({
  data,
  labels,
  name,
  color = '#0090fd',
  width = 640,
  formatValue = (v) => v.toLocaleString(),
  showXAxis = true,
  tickCount = 6,
  reveal = false,
  showFill = true,
  showDot = true,
  animated = true,
  className,
}: SparkChartProps) {
  const uid = React.useId()
  const fillId = `${uid}-fill`
  const clipId = `${uid}-clip`
  const transition = animated ? TRANSITION : '0ms'

  const plotRef = React.useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(data.length - 1)
  // Tracked only to keep the X-axis tick density readable at any width.
  const [boxWidth, setBoxWidth] = React.useState(width)

  React.useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width
      if (w) setBoxWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const points = React.useMemo<Point[]>(() => {
    const n = data.length
    if (n === 0) return []
    // Single pass rather than Math.min/max(...data): `data` is unconstrained,
    // and spreading a large array overflows the call argument limit.
    let min = data[0]
    let max = data[0]
    for (let i = 1; i < n; i++) {
      if (data[i] < min) min = data[i]
      if (data[i] > max) max = data[i]
    }
    const range = max - min || 1
    const innerH = VIEW_H - PAD_TOP - PAD_BOTTOM
    return data.map((value, i) => ({
      value,
      index: i,
      x: n === 1 ? VIEW_W / 2 : (i / (n - 1)) * VIEW_W,
      y: PAD_TOP + (1 - (value - min) / range) * innerH,
    }))
  }, [data])

  const { strokePath, fillPath } = React.useMemo(() => {
    if (points.length === 0) return { strokePath: '', fillPath: '' }
    const stroke = roundedLinePath(points, CORNER_RADIUS)
    const first = points[0]
    const last = points[points.length - 1]
    const baseY = VIEW_H - PAD_BOTTOM
    const fill = `${stroke} L${last.x.toFixed(3)} ${baseY} L${first.x.toFixed(3)} ${baseY} Z`
    return { strokePath: stroke, fillPath: fill }
  }, [points])

  const showAxis = showXAxis && !!labels && labels.length > 0
  const tickIndices = React.useMemo(() => {
    if (!showAxis) return []
    const n = points.length
    // Reserve ~80px per label so ticks never collide on narrow widths.
    const maxFit = Math.max(2, Math.floor(boxWidth / 80))
    const count = Math.min(tickCount, maxFit, n)
    if (count <= 1) return [0]
    return Array.from({ length: count }, (_, i) =>
      Math.round((i * (n - 1)) / (count - 1)),
    )
  }, [showAxis, points.length, tickCount, boxWidth])

  // Snap the active point to the sample nearest the pointer.
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = plotRef.current
    if (!el || points.length === 0) return
    const rect = el.getBoundingClientRect()
    const t = (e.clientX - rect.left) / rect.width
    const idx = Math.round(t * (points.length - 1))
    setActiveIndex(Math.max(0, Math.min(points.length - 1, idx)))
    setHovering(true)
  }

  if (points.length === 0) return null

  const active = points[Math.min(activeIndex, points.length - 1)]
  const tooltipOnLeft = active.x / VIEW_W > 0.5
  // Pixel offsets so the cursor, dot, and tooltip animate on the GPU
  // (translate3d) instead of triggering layout on every pointer move.
  const boxHeight = (boxWidth * VIEW_H) / VIEW_W
  const cursorX = (active.x / VIEW_W) * boxWidth
  const cursorY = (active.y / VIEW_H) * boxHeight

  return (
    <div
      role="img"
      aria-label={name ? `${name} line chart` : 'line chart'}
      style={{ maxWidth: width, '--spark-color': color } as React.CSSProperties}
      className={cn(
        'w-full select-none',
        '[--spark-line:#c7c7c7] [--spark-fill:#e8e8e8]',
        'dark:[--spark-line:#4f4f4f] dark:[--spark-fill:#2d2d2d]',
        className,
      )}
    >
      <div
        ref={plotRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovering(false)}
        className="relative aspect-[640/220] w-full touch-none"
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          fill="none"
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient
              id={fillId}
              x1={VIEW_W / 2}
              y1={PAD_TOP}
              x2={VIEW_W / 2}
              y2={VIEW_H}
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="var(--spark-fill)" />
              <stop offset="1" stopColor="var(--spark-fill)" stopOpacity="0" />
            </linearGradient>
            {reveal && (
              <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                <rect
                  x={0}
                  y={0}
                  width={VIEW_W}
                  height={VIEW_H}
                  style={{
                    transform: `scaleX(${active.x / VIEW_W})`,
                    transformOrigin: 'left center',
                    transition: `transform ${transition}`,
                  }}
                />
              </clipPath>
            )}
          </defs>

          {showFill && <path d={fillPath} fill={`url(#${fillId})`} />}

          {reveal ? (
            <>
              <path
                d={strokePath}
                stroke="var(--spark-line)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g clipPath={`url(#${clipId})`}>
                <path
                  d={strokePath}
                  stroke="var(--spark-color)"
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </>
          ) : (
            <path
              d={strokePath}
              stroke="var(--spark-color)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {hovering && (
          <>
            {/* Vertical cursor at the active point. */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 rounded-full bg-(--spark-line)"
              style={{
                width: CURSOR_WIDTH,
                top: `${(PAD_TOP / VIEW_H) * 100}%`,
                height: `${((VIEW_H - PAD_TOP - PAD_BOTTOM / 2) / VIEW_H) * 100}%`,
                transform: `translate3d(${cursorX - CURSOR_WIDTH / 2}px, 0, 0)`,
                transition: `transform ${transition}`,
                willChange: 'transform',
              }}
            />

            {showDot && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 z-10 rounded-full bg-(--spark-color)"
                style={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  transform: `translate3d(${cursorX - DOT_SIZE / 2}px, ${cursorY - DOT_SIZE / 2}px, 0)`,
                  boxShadow: DOT_SHADOW,
                  transition: `transform ${transition}`,
                  willChange: 'transform',
                }}
              />
            )}

            <div
              className="border-border/50 bg-background pointer-events-none absolute left-0 top-0 z-20 grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl"
              style={{
                transform: tooltipOnLeft
                  ? `translate3d(calc(${cursorX}px - 100% - ${TOOLTIP_GAP}px), calc(${cursorY}px - 50%), 0)`
                  : `translate3d(${cursorX + TOOLTIP_GAP}px, calc(${cursorY}px - 50%), 0)`,
                transition: `transform ${transition}`,
                willChange: 'transform',
              }}
            >
              {labels?.[active.index] && (
                <div className="border-border/50 text-foreground mb-0.5 border-b pb-2 font-medium">
                  {labels[active.index]}
                </div>
              )}
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="bg-(--spark-color) h-2.5 w-2.5 shrink-0 rounded-[2px]" />
                  {name && (
                    <span className="text-muted-foreground whitespace-nowrap">
                      {name}
                    </span>
                  )}
                </div>
                <span className="text-foreground font-semibold tabular-nums">
                  {formatValue(active.value, active.index)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {showAxis && (
        <div className="relative mt-2 h-5">
          {tickIndices.map((i) => (
            <div
              key={i}
              className="text-muted-foreground absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] leading-none tabular-nums"
              style={{ left: `${(points[i].x / VIEW_W) * 100}%` }}
            >
              {labels?.[i]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
