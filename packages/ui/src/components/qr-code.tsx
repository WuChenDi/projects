'use client'

import { Check, Loader2, RefreshCw } from 'lucide-react'
import QRCodeLib from 'qrcode'
import * as React from 'react'
import { cn } from '@cdlab/ui/lib/utils'

type IconSize = number | { width: number; height: number }

type QRCodeStatus = 'active' | 'loading' | 'expired' | 'scanned'

export interface QRCodeHandle {
  /** Trigger a file download (PNG for canvas, SVG for svg). */
  download: (filename?: string) => void
  /** Serialize the current render to a data URL. */
  toDataURL: (mimeType?: string) => string | undefined
}

interface QRCodeProps {
  /** The text or URL to encode in the QR code. */
  value: string
  /** Render backend. */
  type?: 'canvas' | 'svg'
  /** QR code size in pixels. */
  size?: number
  /** Foreground (dark) color. */
  fgColor?: string
  /** Background (light) color. */
  bgColor?: string
  /** Data module shape. */
  dotType?: 'dot' | 'square'
  /** Finder (corner) pattern shape. */
  finderType?: 'rounded' | 'square'
  /** Image URL rendered in the center of the QR code. */
  icon?: string
  /** Center image size in pixels. Defaults to ~25% of `size`. */
  iconSize?: IconSize
  /** Padding around the center icon in pixels. Defaults to `size * 0.03`. */
  iconPadding?: number
  /** Quiet-zone margin, in modules. 0 means no margin. */
  marginSize?: number
  /** Render a border around the QR code. */
  bordered?: boolean
  /** Overlay state. `expired` blurs the code and shows a refresh action. */
  status?: QRCodeStatus
  /** Called when the refresh action of the `expired` overlay is clicked. */
  onRefresh?: () => void
  /** Error correction level. L: 7%, M: 15%, Q: 25%, H: 30%. */
  errorLevel?: 'L' | 'M' | 'Q' | 'H'
  className?: string
}

interface Geometry {
  moduleSize: number
  finders: { x: number; y: number }[]
  finderSize: number
  innerPadding: number
  innerWhiteSize: number
  innerBlackSize: number
  cells: { x: number; y: number }[]
}

function isInFinderPattern(row: number, col: number, size: number): boolean {
  return (
    (row < 7 && col < 7) ||
    (row < 7 && col >= size - 7) ||
    (row >= size - 7 && col < 7)
  )
}

function resolveColor(el: Element, color: string): string {
  if (!color.startsWith('var(')) return color
  const name = color.slice(4, -1).split(',')[0].trim()
  return getComputedStyle(el).getPropertyValue(name).trim() || color
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const target = w / h
  let sx = 0
  let sy = 0
  let sw = img.naturalWidth
  let sh = img.naturalHeight
  if (sw / sh > target) {
    sw = sh * target
    sx = (img.naturalWidth - sw) / 2
  } else {
    sh = sw / target
    sy = (img.naturalHeight - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

export const QRCode = React.forwardRef<QRCodeHandle, QRCodeProps>(
  function QRCode(
    {
      value,
      type = 'svg',
      size = 268,
      fgColor = 'var(--foreground)',
      bgColor = 'var(--background)',
      dotType = 'dot',
      finderType = 'rounded',
      icon,
      iconSize,
      iconPadding,
      marginSize = 0,
      bordered = false,
      status = 'active',
      onRefresh,
      errorLevel = 'M',
      className,
    }: QRCodeProps,
    ref,
  ) {
    const clipId = React.useId()
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const svgRef = React.useRef<SVGSVGElement>(null)
    const [themeTick, setThemeTick] = React.useState(0)

    const qrData = React.useMemo(() => {
      try {
        return QRCodeLib.create(value, { errorCorrectionLevel: errorLevel })
      } catch {
        return null
      }
    }, [value, errorLevel])

    const geometry = React.useMemo<Geometry | null>(() => {
      if (!qrData) return null

      const moduleCount = qrData.modules.size
      const totalModules = moduleCount + marginSize * 2
      const moduleSize = size / totalModules
      const offset = marginSize * moduleSize

      const finders = (
        [
          [0, 0],
          [0, moduleCount - 7],
          [moduleCount - 7, 0],
        ] as [number, number][]
      ).map(([r, c]) => ({
        x: offset + c * moduleSize,
        y: offset + r * moduleSize,
      }))

      const cells: { x: number; y: number }[] = []
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (
            qrData.modules.get(row, col) &&
            !isInFinderPattern(row, col, moduleCount)
          ) {
            cells.push({
              x: offset + col * moduleSize,
              y: offset + row * moduleSize,
            })
          }
        }
      }

      return {
        moduleSize,
        finders,
        finderSize: 7 * moduleSize,
        innerPadding: moduleSize,
        innerWhiteSize: 5 * moduleSize,
        innerBlackSize: 3 * moduleSize,
        cells,
      }
    }, [qrData, size, marginSize])

    const iconDims = React.useMemo(() => {
      if (!icon) return null
      if (typeof iconSize === 'number') return { w: iconSize, h: iconSize }
      if (iconSize) return { w: iconSize.width, h: iconSize.height }
      return { w: size * 0.25, h: size * 0.25 }
    }, [icon, iconSize, size])

    const resolvedIconPadding = iconPadding ?? size * 0.03
    const iconRadius = size * 0.05
    const ix = iconDims ? (size - iconDims.w) / 2 : 0
    const iy = iconDims ? (size - iconDims.h) / 2 : 0
    const finderRadii = finderType === 'rounded' ? [12, 8, 3] : [0, 0, 0]

    React.useImperativeHandle(
      ref,
      () => ({
        toDataURL: (mimeType = 'image/png') => {
          if (type === 'canvas') return canvasRef.current?.toDataURL(mimeType)
          if (svgRef.current) {
            const source = new XMLSerializer().serializeToString(svgRef.current)
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
          }
          return undefined
        },
        download: (filename) => {
          const ext = type === 'canvas' ? 'png' : 'svg'
          const href =
            type === 'canvas'
              ? canvasRef.current?.toDataURL('image/png')
              : svgRef.current
                ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                    new XMLSerializer().serializeToString(svgRef.current),
                  )}`
                : undefined
          if (!href) return
          const link = document.createElement('a')
          link.download = filename ?? `qrcode.${ext}`
          link.href = href
          link.click()
        },
      }),
      [type],
    )

    React.useEffect(() => {
      if (type !== 'canvas') return
      const observer = new MutationObserver(() => setThemeTick((t) => t + 1))
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      })
      return () => observer.disconnect()
    }, [type])

    // biome-ignore lint/correctness/useExhaustiveDependencies: themeTick forces a repaint when the theme (CSS variables) changes
    React.useEffect(() => {
      if (type !== 'canvas') return
      const canvas = canvasRef.current
      if (!canvas || !geometry) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)

      const fg = resolveColor(canvas, fgColor)
      const bg = resolveColor(canvas, bgColor)
      const radii = finderType === 'rounded' ? [12, 8, 3] : [0, 0, 0]

      const fillRound = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        color: string,
      ) => {
        ctx.beginPath()
        if (r > 0 && ctx.roundRect) {
          ctx.roundRect(x, y, w, h, r)
        } else {
          ctx.rect(x, y, w, h)
        }
        ctx.fillStyle = color
        ctx.fill()
      }

      fillRound(0, 0, size, size, 12, bg)

      for (const { x, y } of geometry.finders) {
        fillRound(x, y, geometry.finderSize, geometry.finderSize, radii[0], fg)
        fillRound(
          x + geometry.innerPadding,
          y + geometry.innerPadding,
          geometry.innerWhiteSize,
          geometry.innerWhiteSize,
          radii[1],
          bg,
        )
        fillRound(
          x + geometry.innerPadding * 2,
          y + geometry.innerPadding * 2,
          geometry.innerBlackSize,
          geometry.innerBlackSize,
          radii[2],
          fg,
        )
      }

      ctx.fillStyle = fg
      const { moduleSize } = geometry
      for (const { x, y } of geometry.cells) {
        if (dotType === 'square') {
          ctx.fillRect(x, y, moduleSize, moduleSize)
        } else {
          ctx.beginPath()
          ctx.arc(
            x + moduleSize / 2,
            y + moduleSize / 2,
            moduleSize / 3,
            0,
            Math.PI * 2,
          )
          ctx.fill()
        }
      }

      if (!icon || !iconDims) return
      let cancelled = false
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (cancelled) return
        fillRound(
          ix - resolvedIconPadding,
          iy - resolvedIconPadding,
          iconDims.w + resolvedIconPadding * 2,
          iconDims.h + resolvedIconPadding * 2,
          iconRadius,
          bg,
        )
        ctx.save()
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(ix, iy, iconDims.w, iconDims.h, iconRadius * 0.7)
        } else {
          ctx.rect(ix, iy, iconDims.w, iconDims.h)
        }
        ctx.clip()
        drawCover(ctx, img, ix, iy, iconDims.w, iconDims.h)
        ctx.restore()
      }
      img.src = icon
      return () => {
        cancelled = true
      }
    }, [
      type,
      geometry,
      size,
      fgColor,
      bgColor,
      dotType,
      icon,
      iconDims,
      ix,
      iy,
      iconRadius,
      resolvedIconPadding,
      finderType,
      themeTick,
    ])

    if (!geometry) return null

    const graphicClass = cn('block', status !== 'active' && 'blur-[2px]')

    const graphic =
      type === 'canvas' ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`QR code for ${value}`}
          className={cn(graphicClass, 'h-full w-full')}
        />
      ) : (
        <svg
          ref={svgRef}
          role="img"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          xmlns="http://www.w3.org/2000/svg"
          aria-label={`QR code for ${value}`}
          className={cn(graphicClass, 'h-full w-full')}
        >
          <rect width={size} height={size} fill={bgColor} rx="12" ry="12" />
          {geometry.finders.map(({ x, y }) => (
            <g key={`${x}-${y}`}>
              <rect
                x={x}
                y={y}
                width={geometry.finderSize}
                height={geometry.finderSize}
                fill={fgColor}
                rx={finderRadii[0]}
                ry={finderRadii[0]}
              />
              <rect
                x={x + geometry.innerPadding}
                y={y + geometry.innerPadding}
                width={geometry.innerWhiteSize}
                height={geometry.innerWhiteSize}
                fill={bgColor}
                rx={finderRadii[1]}
                ry={finderRadii[1]}
              />
              <rect
                x={x + geometry.innerPadding * 2}
                y={y + geometry.innerPadding * 2}
                width={geometry.innerBlackSize}
                height={geometry.innerBlackSize}
                fill={fgColor}
                rx={finderRadii[2]}
                ry={finderRadii[2]}
              />
            </g>
          ))}
          {geometry.cells.map(({ x, y }) =>
            dotType === 'square' ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={geometry.moduleSize}
                height={geometry.moduleSize}
                fill={fgColor}
              />
            ) : (
              <circle
                key={`${x}-${y}`}
                cx={x + geometry.moduleSize / 2}
                cy={y + geometry.moduleSize / 2}
                r={geometry.moduleSize / 3}
                fill={fgColor}
              />
            ),
          )}
          {icon && iconDims && (
            <>
              <clipPath id={clipId}>
                <rect
                  x={ix}
                  y={iy}
                  width={iconDims.w}
                  height={iconDims.h}
                  rx={iconRadius * 0.7}
                  ry={iconRadius * 0.7}
                />
              </clipPath>
              <rect
                x={ix - resolvedIconPadding}
                y={iy - resolvedIconPadding}
                width={iconDims.w + resolvedIconPadding * 2}
                height={iconDims.h + resolvedIconPadding * 2}
                fill={bgColor}
                rx={iconRadius}
                ry={iconRadius}
              />
              <image
                href={icon}
                x={ix}
                y={iy}
                width={iconDims.w}
                height={iconDims.h}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
              />
            </>
          )}
        </svg>
      )

    return (
      <div
        className={cn(
          'relative inline-block max-w-full',
          bordered && 'rounded-xl border border-input',
          className,
        )}
        style={{ width: size, aspectRatio: '1 / 1' }}
      >
        {graphic}
        {status !== 'active' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-background/85 text-sm text-muted-foreground">
            {status === 'loading' && (
              <Loader2 className="size-6 animate-spin" aria-label="loading" />
            )}
            {status === 'expired' && (
              <>
                <span>QR code expired</span>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <RefreshCw className="size-4" />
                    Refresh
                  </button>
                )}
              </>
            )}
            {status === 'scanned' && (
              <Check className="size-8 text-emerald-500" aria-label="scanned" />
            )}
          </div>
        )}
      </div>
    )
  },
)

QRCode.displayName = 'QRCode'
