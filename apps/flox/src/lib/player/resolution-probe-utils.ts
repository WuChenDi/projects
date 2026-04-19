import { extractQualityLabel } from '@/lib/utils/video'

export interface ResolutionProbeLabel {
  label: string
  color: string
  width?: number
  height?: number
}

const QUALITY_RANK: Record<string, number> = {
  '8K': 780,
  '4K': 700,
  '2K': 620,
  '1080P': 540,
  '720P': 420,
  '540P': 300,
  '480P': 260,
  '360P': 220,
  '240P': 180,
  '144P': 160,
}

const DIMENSION_PATTERN = /(\d{3,4})\s*[xX]\s*(\d{3,4})/g
const HLS_RESOLUTION_PATTERN = /RESOLUTION=(\d+)x(\d+)/gi
const TEXT_QUALITY_PATTERNS: Array<{
  pattern: RegExp
  width?: number
  height?: number
  label: string
  color: string
}> = [
  { pattern: /(?:^|[^\d])(4320p?|8k)(?:[^\d]|$)/i, width: 7680, height: 4320, label: '8K', color: 'bg-rose-500' },
  { pattern: /(?:^|[^\d])(2160p?|4k|uhd)(?:[^\d]|$)/i, width: 3840, height: 2160, label: '4K', color: 'bg-amber-500' },
  { pattern: /(?:^|[^\d])(1440p?|2k|qhd)(?:[^\d]|$)/i, width: 2560, height: 1440, label: '2K', color: 'bg-emerald-500' },
  { pattern: /(?:^|[^\d])(1080p?|1080i|fhd|fullhd|full-hd)(?:[^\d]|$)/i, width: 1920, height: 1080, label: '1080P', color: 'bg-green-500' },
  { pattern: /(?:^|[^\d])(720p?|hd720)(?:[^\d]|$)/i, width: 1280, height: 720, label: '720P', color: 'bg-teal-500' },
  { pattern: /(?:^|[^\d])540p?(?:[^\d]|$)/i, width: 960, height: 540, label: '540P', color: 'bg-cyan-500' },
  { pattern: /(?:^|[^\d])480p?(?:[^\d]|$)/i, width: 854, height: 480, label: '480P', color: 'bg-sky-500' },
  { pattern: /(?:^|[^\d])360p?(?:[^\d]|$)/i, width: 640, height: 360, label: '360P', color: 'bg-gray-500' },
  { pattern: /(?:^|[^\d])240p?(?:[^\d]|$)/i, width: 426, height: 240, label: '240P', color: 'bg-gray-500' },
  { pattern: /(?:^|[^\d])144p?(?:[^\d]|$)/i, width: 256, height: 144, label: '144P', color: 'bg-gray-500' },
]

export function getResolutionLabel(width: number, height: number): ResolutionProbeLabel {
  const w = Math.max(width, height)
  const h = Math.min(width, height)
  if (h >= 4320) return { width: w, height: h, label: '8K', color: 'bg-rose-500' }
  if (h >= 2160) return { width: w, height: h, label: '4K', color: 'bg-amber-500' }
  if (h >= 1440) return { width: w, height: h, label: '2K', color: 'bg-emerald-500' }
  if (h >= 1080) return { width: w, height: h, label: '1080P', color: 'bg-green-500' }
  if (h >= 720) return { width: w, height: h, label: '720P', color: 'bg-teal-500' }
  if (h >= 540) return { width: w, height: h, label: '540P', color: 'bg-cyan-500' }
  if (h >= 480) return { width: w, height: h, label: '480P', color: 'bg-sky-500' }
  if (h >= 360) return { width: w, height: h, label: '360P', color: 'bg-gray-500' }
  if (h >= 240) return { width: w, height: h, label: '240P', color: 'bg-gray-500' }
  if (h >= 144) return { width: w, height: h, label: '144P', color: 'bg-gray-500' }
  return { width: w, height: h, label: `${h}P`, color: 'bg-gray-500' }
}

function getCandidateRank(candidate: ResolutionProbeLabel): number {
  if (candidate.width && candidate.height) return candidate.width * candidate.height
  return QUALITY_RANK[candidate.label] || 0
}

export function chooseHigherQuality(
  current: ResolutionProbeLabel | null,
  candidate: ResolutionProbeLabel | null,
): ResolutionProbeLabel | null {
  if (!candidate) return current
  if (!current) return candidate
  return getCandidateRank(candidate) > getCandidateRank(current) ? candidate : current
}

export function extractResolutionHint(...values: Array<string | undefined>): ResolutionProbeLabel | null {
  let best: ResolutionProbeLabel | null = null

  for (const value of values) {
    if (!value) continue

    DIMENSION_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = DIMENSION_PATTERN.exec(value)) !== null) {
      const width = Number.parseInt(match[1], 10)
      const height = Number.parseInt(match[2], 10)
      if (width > 0 && height > 0) {
        best = chooseHigherQuality(best, getResolutionLabel(width, height))
      }
    }

    for (const p of TEXT_QUALITY_PATTERNS) {
      if (p.pattern.test(value)) {
        best = chooseHigherQuality(best, { label: p.label, color: p.color, width: p.width, height: p.height })
      }
    }

    const qualityHint = extractQualityLabel(value)
    if (qualityHint) {
      best = chooseHigherQuality(best, { label: qualityHint.label, color: qualityHint.color })
    }
  }

  return best
}

export function parseResolutionFromManifest(
  content: string,
  baseUrl?: string,
): ResolutionProbeLabel | null {
  let best: ResolutionProbeLabel | null = null

  HLS_RESOLUTION_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = HLS_RESOLUTION_PATTERN.exec(content)) !== null) {
    const width = Number.parseInt(match[1], 10)
    const height = Number.parseInt(match[2], 10)
    if (width > 0 && height > 0) {
      best = chooseHigherQuality(best, getResolutionLabel(width, height))
    }
  }

  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (line.startsWith('#EXT-X-STREAM-INF') || line.startsWith('#EXT-X-I-FRAME-STREAM-INF')) {
      best = chooseHigherQuality(best, extractResolutionHint(line))
      continue
    }

    if (line.startsWith('#')) continue

    const resolvedLine = baseUrl
      ? (() => { try { return new URL(line, baseUrl).toString() } catch { return line } })()
      : line

    best = chooseHigherQuality(best, extractResolutionHint(resolvedLine, line))
  }

  return best
}

export function extractVariantPlaylistUrls(content: string, baseUrl: string): string[] {
  const urls = new Set<string>()
  const lines = content.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (line.startsWith('#EXT-X-I-FRAME-STREAM-INF') && line.includes('URI="')) {
      const uriMatch = line.match(/URI="([^"]+)"/i)
      if (uriMatch?.[1]) {
        try { urls.add(new URL(uriMatch[1], baseUrl).toString()) } catch { /* ignore */ }
      }
      continue
    }

    if (!line.startsWith('#EXT-X-STREAM-INF')) continue

    const candidate = lines[i + 1]?.trim()
    if (!candidate || candidate.startsWith('#')) continue

    try { urls.add(new URL(candidate, baseUrl).toString()) } catch { /* ignore */ }
  }

  return Array.from(urls)
}
