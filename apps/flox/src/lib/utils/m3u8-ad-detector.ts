/**
 * M3U8 Heuristic Ad Detection Module
 *
 * Splits an M3U8 playlist into blocks by #EXT-X-DISCONTINUITY markers,
 * learns the main-content fingerprint (MainPattern) from the largest block,
 * then scores every other block across multiple dimensions.
 * Blocks exceeding the threshold are flagged as ads.
 *
 * Scoring dimensions (see scoreBlock):
 *   CUE tags / path prefix / small block / sequence gap /
 *   filename length / URL keywords / filename pattern / duration anomaly
 */

/** Common ad-related URL path keywords used for scoring */
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

// ─── Type Definitions ──────────────────────────────────────

/** A single ts segment */
interface Segment {
  url: string
  duration: number
  /** Line index of this URL in the original lines array */
  lineIndex: number
}

/** A group of segments between two #EXT-X-DISCONTINUITY markers */
interface Block {
  segments: Segment[]
  startLineIndex: number
  endLineIndex: number
  /** Whether this block contains SCTE-35 CUE-OUT / CUE-IN tags */
  hasCueTag: boolean
}

/**
 * Fingerprint extracted from the largest block (main content).
 *
 * Two categories:
 * 1. Per-block features — filenameRegex, avgDuration, commonPrefix, pathPrefix,
 *    avgFilenameBaseLength, isSequentialTs, tsNumberRange, dominantDuration
 * 2. Playlist-wide stats — medianBlockSize, totalBlocks
 */
interface MainPattern {
  /** Regex built from the common filename prefix (generated when prefix >= 2 chars) */
  filenameRegex: RegExp | null
  /** Average segment duration in seconds */
  avgDuration: number
  /** Common filename prefix string */
  commonPrefix: string
  /** CDN directory path, e.g. "/20230907/73PWifvT/1392kb/hls/" */
  pathPrefix: string
  /** Average filename length excluding extension */
  avgFilenameBaseLength: number
  /** Whether the main block uses sequential numbering (00001.ts, 00002.ts, ...) */
  isSequentialTs: boolean
  /** Sequence number range; only set when isSequentialTs is true */
  tsNumberRange: { min: number; max: number } | null
  /** Most frequent segment duration (bucketed at 0.5s precision) */
  dominantDuration: number
  /** Median segment count across all blocks, used for small-block detection */
  medianBlockSize: number
  /** Total number of blocks in the playlist */
  totalBlocks: number
}

// ─── Parsing ───────────────────────────────────────────────

/**
 * Split M3U8 lines into Block list by #EXT-X-DISCONTINUITY.
 * Also detects CUE-OUT / CUE-IN tags and marks the containing block.
 */
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

// ─── URL / Filename Helpers ────────────────────────────────

/** Extract filename from a URL (handles both absolute and relative paths) */
function extractFilename(url: string): string {
  try {
    const path = url.includes('://') ? new URL(url).pathname : url
    const parts = path.split('/')
    return parts[parts.length - 1] || ''
  } catch {
    return url.split('/').pop() || ''
  }
}

/** Find the longest common prefix of an array of strings */
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

/**
 * Extract the directory path prefix from a URL (without the filename).
 * "/20230907/73PWifvT/1392kb/hls/gFE6lwIk.ts" → "/20230907/73PWifvT/1392kb/hls/"
 */
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

/**
 * Extract the numeric index from a ts filename.
 * "00001.ts" → 1 / "segment003.ts" → 3 / "aBcDeFgH.ts" → null
 */
function extractTsNumber(url: string): number | null {
  const filename = extractFilename(url)
  const match = filename.match(/(\d+)\.ts/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Get filename length excluding the extension.
 * "00001.ts" → 5 / "abcdefghij.ts" → 10
 */
function getFilenameBaseLength(url: string): number {
  const filename = extractFilename(url)
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? dotIndex : filename.length
}

/**
 * Find the most frequent segment duration using 0.5s-precision bucketing
 * to tolerate floating-point variance.
 */
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

// ─── Pattern Learning ──────────────────────────────────────

/**
 * Learn the main-content fingerprint from all blocks.
 * Strategy: treat the block with the most segments as the main-content
 * representative and extract per-dimension features from it.
 */
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

  // --- Filename prefix & regex ---
  const filenames = mainBlock.segments.map((s) => extractFilename(s.url))
  const commonPrefix = findCommonPrefix(filenames)

  let filenameRegex: RegExp | null = null
  if (commonPrefix.length >= 2) {
    const escapedPrefix = commonPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filenameRegex = new RegExp(`^${escapedPrefix}`)
  }

  // --- Average duration ---
  const totalDuration = mainBlock.segments.reduce(
    (sum, s) => sum + s.duration,
    0,
  )
  const avgDuration = totalDuration / mainBlock.segments.length

  // --- CDN directory path ---
  const pathPrefix = extractPathPrefix(mainBlock.segments[0].url)

  // --- Average filename base length ---
  const filenameLengths = mainBlock.segments.map((s) =>
    getFilenameBaseLength(s.url),
  )
  const avgFilenameBaseLength =
    filenameLengths.reduce((a, b) => a + b, 0) / filenameLengths.length

  // --- Sequential numbering detection ---
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

  // --- Dominant segment duration ---
  const dominantDuration = findDominantDuration(mainBlock.segments)

  // --- Playlist-wide median block size ---
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

// ─── Scoring ───────────────────────────────────────────────

/**
 * Score a single block for ad likelihood. Higher score = more likely an ad.
 *
 * Dimensions and their contributions:
 *   10.0  — CUE tag (SCTE-35) — immediate verdict
 *   +5.0  — CDN path prefix differs from main content
 *   +5.0  — Small block (segment count <= 20% of median)
 *   +4.0  — ts sequence numbers outside the main-content range
 *   +3.0  — Filename base length differs by > 2 chars from main content
 *   +3.0  — Small block (segment count <= 35% of median)
 *   +2.5  — URL contains an ad keyword (per matching segment)
 *   +2.0  — Main content uses numeric ts names but this block does not
 *   +1.5  — Filename prefix pattern mismatch
 *   +1.5  — Dominant segment duration differs > 30% from main content
 */
export function scoreBlock(
  block: Block,
  mainPattern: MainPattern,
  extraKeywords: string[] = [],
): number {
  let score = 0

  // CUE tag → definite ad
  if (block.hasCueTag) {
    return 10
  }

  // URL keyword match (filter out very short custom keywords to avoid false positives)
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

  // Short ad keyword match — detect "ad" as a path segment or filename prefix
  // e.g. "/and/ad1.ts", "../ad/clip.ts", "ad01.ts"
  // Uses word-boundary-aware patterns to avoid false positives like "loading.ts"
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

  // Filename prefix pattern mismatch
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

  // CDN path prefix mismatch
  if (mainPattern.pathPrefix && block.segments.length > 0) {
    const pathMismatchCount = block.segments.filter((s) => {
      const segmentPathPrefix = extractPathPrefix(s.url)
      return segmentPathPrefix !== mainPattern.pathPrefix
    }).length

    if (pathMismatchCount === block.segments.length) {
      score += 5.0
    }
  }

  // Filename base length variance
  // e.g. main content "00001.ts" (len=5) vs ad "abcdefghij.ts" (len=10)
  if (mainPattern.avgFilenameBaseLength > 0 && block.segments.length > 0) {
    const blockLengths = block.segments.map((s) => getFilenameBaseLength(s.url))
    const blockAvgLen =
      blockLengths.reduce((a, b) => a + b, 0) / blockLengths.length
    const lengthDiff = Math.abs(blockAvgLen - mainPattern.avgFilenameBaseLength)
    if (lengthDiff > 2) {
      score += 3.0
    }
  }

  // ts sequence number gap
  // Main content numbers 1→2→…→N; ad numbers fall outside that range
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
      // Has .ts files but no numeric pattern while main content uses sequential numbering
      score += 2.0
    }
  }

  // Segment duration anomaly (e.g. main=10s, ad=15s)
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

  // Small block detection (DISCONTINUITY sandwich)
  // When all other signals are identical (same CDN, path, filename length, duration),
  // block size is the only remaining differentiator
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

// ─── Thresholds & Verdict ──────────────────────────────────

/** Score thresholds: heuristic mode uses HIGH (5.0), aggressive mode uses LOW (3.0) */
export const THRESHOLDS = {
  HIGH: 5.0,
  LOW: 3.0,
}

/** Determine whether a block should be filtered based on its score */
export function shouldFilterBlock(
  score: number,
  threshold: number = THRESHOLDS.HIGH,
): boolean {
  return score >= threshold
}
