/**
 * M3U8 Heuristic Ad Detection Module
 *
 * Splits an M3U8 playlist into blocks by #EXT-X-DISCONTINUITY markers,
 * learns the main-content fingerprint (MainPattern) from the largest block,
 * then scores every other block across multiple dimensions.
 * Blocks exceeding the threshold are flagged as ads.
 */

export const AD_PATH_KEYWORDS = [
  'advert',
  'preroll',
  'midroll',
  'postroll',
  'dai',
  'vast',
  'ima',
  'adjump',
  'commercial',
  'sponsor',
]

interface Segment {
  url: string
  duration: number
  lineIndex: number
}

interface Block {
  segments: Segment[]
  startLineIndex: number
  endLineIndex: number
  hasCueTag: boolean
}

interface MainPattern {
  filenameRegex: RegExp | null
  avgDuration: number
  commonPrefix: string
  pathPrefix: string
  avgFilenameBaseLength: number
  isSequentialTs: boolean
  tsNumberRange: { min: number; max: number } | null
  dominantDuration: number
  medianBlockSize: number
  totalBlocks: number
}

export function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  let currentBlock: Block = {
    segments: [],
    startLineIndex: 0,
    endLineIndex: 0,
    hasCueTag: false,
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('#EXT-X-CUE-OUT') || line.startsWith('#EXT-X-CUE-IN')) {
      currentBlock.hasCueTag = true
    }

    if (line === '#EXT-X-DISCONTINUITY') {
      if (currentBlock.segments.length > 0) {
        currentBlock.endLineIndex = i - 1
        blocks.push(currentBlock)
      }
      currentBlock = {
        segments: [],
        startLineIndex: i + 1,
        endLineIndex: 0,
        hasCueTag: false,
      }
      continue
    }

    if (line.startsWith('#EXTINF:')) {
      const durationMatch = line.match(/#EXTINF:([\d.]+)/)
      const duration = durationMatch ? parseFloat(durationMatch[1]) : 0

      if (i + 1 < lines.length) {
        const url = lines[i + 1].trim()
        if (url && !url.startsWith('#')) {
          currentBlock.segments.push({
            url,
            duration,
            lineIndex: i + 1,
          })
        }
      }
    }
  }

  if (currentBlock.segments.length > 0) {
    currentBlock.endLineIndex = lines.length - 1
    blocks.push(currentBlock)
  }

  return blocks
}

function extractFilename(url: string): string {
  try {
    const path = url.includes('://') ? new URL(url).pathname : url
    const parts = path.split('/')
    return parts[parts.length - 1] || ''
  } catch {
    return url.split('/').pop() || ''
  }
}

function findCommonPrefix(strings: string[]): string {
  if (!strings || strings.length < 2) return ''

  let prefix = ''
  const first = strings[0]

  for (let i = 0; i < first.length; i++) {
    const char = first[i]
    if (strings.every((s) => s[i] === char)) {
      prefix += char
    } else {
      break
    }
  }

  return prefix
}

function extractPathPrefix(url: string): string {
  try {
    const path = url.includes('://') ? new URL(url).pathname : url
    const lastSlash = path.lastIndexOf('/')
    return lastSlash >= 0 ? path.substring(0, lastSlash + 1) : ''
  } catch {
    const lastSlash = url.lastIndexOf('/')
    return lastSlash >= 0 ? url.substring(0, lastSlash + 1) : ''
  }
}

function extractTsNumber(url: string): number | null {
  const filename = extractFilename(url)
  const match = filename.match(/(\d+)\.ts/)
  return match ? parseInt(match[1], 10) : null
}

function getFilenameBaseLength(url: string): number {
  const filename = extractFilename(url)
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? dotIndex : filename.length
}

function findDominantDuration(segments: Segment[]): number {
  if (segments.length === 0) return 0
  const buckets = new Map<number, number>()
  for (const s of segments) {
    const key = Math.round(s.duration * 2) / 2
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }
  let maxCount = 0
  let dominant = 0
  for (const [duration, count] of buckets) {
    if (count > maxCount) {
      maxCount = count
      dominant = duration
    }
  }
  return dominant
}

export function learnMainPattern(blocks: Block[]): MainPattern {
  const mainBlock =
    blocks.length > 0
      ? blocks.reduce((largest, block) =>
          block.segments.length > largest.segments.length ? block : largest,
        )
      : null

  if (!mainBlock || mainBlock.segments.length === 0) {
    return {
      filenameRegex: null,
      avgDuration: 0,
      commonPrefix: '',
      pathPrefix: '',
      avgFilenameBaseLength: 0,
      isSequentialTs: false,
      tsNumberRange: null,
      dominantDuration: 0,
      medianBlockSize: 0,
      totalBlocks: 0,
    }
  }

  const filenames = mainBlock.segments.map((s) => extractFilename(s.url))
  const commonPrefix = findCommonPrefix(filenames)

  let filenameRegex: RegExp | null = null
  if (commonPrefix.length >= 2) {
    const escapedPrefix = commonPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filenameRegex = new RegExp(`^${escapedPrefix}`)
  }

  const totalDuration = mainBlock.segments.reduce(
    (sum, s) => sum + s.duration,
    0,
  )
  const avgDuration = totalDuration / mainBlock.segments.length

  const pathPrefix = extractPathPrefix(mainBlock.segments[0].url)

  const filenameLengths = mainBlock.segments.map((s) =>
    getFilenameBaseLength(s.url),
  )
  const avgFilenameBaseLength =
    filenameLengths.reduce((a, b) => a + b, 0) / filenameLengths.length

  const tsNumbers = mainBlock.segments
    .map((s) => extractTsNumber(s.url))
    .filter((n): n is number => n !== null)

  let isSequentialTs = false
  let tsNumberRange: { min: number; max: number } | null = null

  if (tsNumbers.length >= 2 && tsNumbers.length === mainBlock.segments.length) {
    let sequential = true
    for (let i = 1; i < tsNumbers.length; i++) {
      if (tsNumbers[i] !== tsNumbers[i - 1] + 1) {
        sequential = false
        break
      }
    }
    isSequentialTs = sequential
    if (sequential) {
      tsNumberRange = {
        min: tsNumbers[0],
        max: tsNumbers[tsNumbers.length - 1],
      }
    }
  }

  const dominantDuration = findDominantDuration(mainBlock.segments)

  const blockSizes = blocks
    .map((b) => b.segments.length)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  const medianBlockSize =
    blockSizes.length > 0 ? blockSizes[Math.floor(blockSizes.length / 2)] : 0

  return {
    filenameRegex,
    avgDuration,
    commonPrefix,
    pathPrefix,
    avgFilenameBaseLength,
    isSequentialTs,
    tsNumberRange,
    dominantDuration,
    medianBlockSize,
    totalBlocks: blocks.length,
  }
}

export function scoreBlock(
  block: Block,
  mainPattern: MainPattern,
  extraKeywords: string[] = [],
): number {
  let score = 0

  if (block.hasCueTag) {
    return 10
  }

  const safeExtraKeywords = extraKeywords.filter((k) => k.length > 2)
  const allKeywords = [...AD_PATH_KEYWORDS, ...safeExtraKeywords]

  for (const segment of block.segments) {
    const urlLower = segment.url.toLowerCase()
    for (const keyword of allKeywords) {
      if (urlLower.includes(keyword.toLowerCase())) {
        score += 2.5
        break
      }
    }
  }

  if (block.segments.length > 0) {
    const adSegmentPattern = /(?:^|\/)(ad\d*|and)\//i
    const adFilenamePattern = /(?:^|\/)ad\d*\.ts/i
    const adMatchCount = block.segments.filter((s) => {
      const url = s.url.toLowerCase()
      return adSegmentPattern.test(url) || adFilenamePattern.test(url)
    }).length
    if (adMatchCount === block.segments.length) {
      score += 3.0
    }
  }

  if (mainPattern.filenameRegex) {
    const mismatchCount = block.segments.filter((s) => {
      if (!mainPattern.filenameRegex) return false
      const filename = extractFilename(s.url)
      return !mainPattern.filenameRegex.test(filename)
    }).length

    if (mismatchCount === block.segments.length && block.segments.length > 0) {
      score += 1.5
    }
  }

  if (mainPattern.pathPrefix && block.segments.length > 0) {
    const pathMismatchCount = block.segments.filter((s) => {
      const segmentPathPrefix = extractPathPrefix(s.url)
      return segmentPathPrefix !== mainPattern.pathPrefix
    }).length

    if (pathMismatchCount === block.segments.length) {
      score += 5.0
    }
  }

  if (mainPattern.avgFilenameBaseLength > 0 && block.segments.length > 0) {
    const blockLengths = block.segments.map((s) => getFilenameBaseLength(s.url))
    const blockAvgLen =
      blockLengths.reduce((a, b) => a + b, 0) / blockLengths.length
    const lengthDiff = Math.abs(blockAvgLen - mainPattern.avgFilenameBaseLength)
    if (lengthDiff > 2) {
      score += 3.0
    }
  }

  if (
    mainPattern.isSequentialTs &&
    mainPattern.tsNumberRange &&
    block.segments.length > 0
  ) {
    const blockTsNumbers = block.segments
      .map((s) => extractTsNumber(s.url))
      .filter((n): n is number => n !== null)

    if (blockTsNumbers.length > 0) {
      const blockMin = Math.min(...blockTsNumbers)
      const blockMax = Math.max(...blockTsNumbers)
      const { min: mainMin, max: mainMax } = mainPattern.tsNumberRange

      const isConnected =
        (blockMin >= mainMin && blockMax <= mainMax) ||
        Math.abs(blockMin - mainMax) <= 2 ||
        Math.abs(mainMin - blockMax) <= 2

      if (!isConnected) {
        score += 4.0
      }
    } else if (
      block.segments.some((s) => extractFilename(s.url).endsWith('.ts'))
    ) {
      score += 2.0
    }
  }

  if (mainPattern.dominantDuration > 0 && block.segments.length > 0) {
    const blockDominant = findDominantDuration(block.segments)
    if (blockDominant > 0) {
      const durationDiff = Math.abs(
        blockDominant - mainPattern.dominantDuration,
      )
      if (durationDiff / mainPattern.dominantDuration > 0.3) {
        score += 1.5
      }
    }
  }

  if (
    mainPattern.totalBlocks >= 3 &&
    mainPattern.medianBlockSize >= 5 &&
    block.segments.length > 0
  ) {
    const sizeRatio = block.segments.length / mainPattern.medianBlockSize
    if (sizeRatio <= 0.2) {
      score += 5.0
    } else if (sizeRatio <= 0.35) {
      score += 3.0
    }
  }

  return score
}

export const THRESHOLDS = {
  HIGH: 5.0,
  LOW: 3.0,
}

export function shouldFilterBlock(
  score: number,
  threshold: number = THRESHOLDS.HIGH,
): boolean {
  return score >= threshold
}
