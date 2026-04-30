/**
 * M3U8 Ad Filtering & URL Normalization
 *
 * Multi-layered ad removal pipeline for HLS playlists:
 *   1. Heuristic block analysis — score each DISCONTINUITY-delimited block
 *   2. CUE tag state machine — strip SCTE-35 CUE-OUT/CUE-IN ad sections
 *   3. Keyword backtracking — remove segments whose URL matches ad keywords
 *   4. Aggressive DISCONTINUITY stripping
 *   5. URL normalization — resolve relative URLs to absolute
 */

import {
  learnMainPattern,
  parseBlocks,
  scoreBlock,
  shouldFilterBlock,
} from './m3u8-ad-detector'

export type AdFilterMode = 'off' | 'keyword' | 'heuristic' | 'aggressive'

export interface FilterStats {
  blocksScanned: number
  blocksFiltered: number
  segmentsFiltered: number
  cueAdSections: number
  keywordHits: number
}

export function filterM3u8Ad(
  content: string,
  baseUrl: string,
  mode: AdFilterMode = 'heuristic',
  customKeywords: string[] = [],
  stats?: FilterStats,
): string {
  if (!content) return ''

  const keywords = customKeywords

  const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)
  let origin = ''
  try {
    origin = new URL(baseUrl).origin
  } catch (e) {
    /* ignore */
  }

  const hasKeywordMatch =
    mode !== 'off' && keywords.some((k) => content.includes(k))
  const hasCueTag =
    mode !== 'off' &&
    (content.includes('#EXT-X-CUE-OUT') || content.includes('#EXT-X-CUE-IN'))

  const lines = content.split(/\r?\n/)
  const adLineIndices = new Set<number>()

  if (!hasCueTag && (mode === 'heuristic' || mode === 'aggressive')) {
    const blocks = parseBlocks(lines)
    if (stats) stats.blocksScanned += blocks.length
    if (blocks.length > 1) {
      const mainPattern = learnMainPattern(blocks)
      for (const block of blocks) {
        const score = scoreBlock(block, mainPattern, keywords)
        const threshold = mode === 'aggressive' ? 3.0 : 5.0
        if (shouldFilterBlock(score, threshold)) {
          if (stats) stats.blocksFiltered += 1
          for (const segment of block.segments) {
            adLineIndices.add(segment.lineIndex)
            adLineIndices.add(segment.lineIndex - 1)
          }
        }
      }
    }
  }

  const processedLines: string[] = []
  let insideCueAdBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    if (adLineIndices.has(i)) {
      if (stats && !trimmedLine.startsWith('#')) stats.segmentsFiltered += 1
      continue
    }

    if (mode !== 'off' && trimmedLine.startsWith('#EXT-X-CUE-OUT')) {
      insideCueAdBlock = true
      if (stats) stats.cueAdSections += 1
      if (
        processedLines.length > 0 &&
        processedLines[processedLines.length - 1].trim() ===
          '#EXT-X-DISCONTINUITY'
      ) {
        processedLines.pop()
      }
      continue
    }

    if (trimmedLine.startsWith('#EXT-X-CUE-IN')) {
      insideCueAdBlock = false
      if (
        i + 1 < lines.length &&
        lines[i + 1].trim() === '#EXT-X-DISCONTINUITY'
      ) {
        i++
      }
      continue
    }

    if (insideCueAdBlock) {
      continue
    }

    if (
      keywords.length > 0 &&
      hasKeywordMatch &&
      keywords.some((keyword) => trimmedLine.includes(keyword))
    ) {
      if (stats) stats.keywordHits += 1
      while (processedLines.length > 0) {
        const lastLine = processedLines[processedLines.length - 1].trim()

        if (
          lastLine.startsWith('#EXTINF:') ||
          lastLine === '#EXT-X-DISCONTINUITY'
        ) {
          processedLines.pop()
        } else {
          break
        }
      }
      continue
    }

    if (trimmedLine === '#EXT-X-DISCONTINUITY') {
      if (mode !== 'aggressive') {
        processedLines.push(line)
      }
      continue
    }

    if (
      !trimmedLine ||
      trimmedLine.startsWith('http') ||
      trimmedLine.startsWith('blob:')
    ) {
      processedLines.push(line)
      continue
    }

    if (trimmedLine.startsWith('#')) {
      if (trimmedLine.includes('URI="')) {
        processedLines.push(
          line.replace(/URI="([^"]+)"/g, (match, uri) => {
            if (uri.startsWith('http')) return match
            if (uri.startsWith('/')) {
              return `URI="${origin}${uri}"`
            }
            return `URI="${basePath}${uri}"`
          }),
        )
      } else {
        processedLines.push(line)
      }
      continue
    }

    if (trimmedLine.startsWith('/')) {
      processedLines.push(origin ? `${origin}${trimmedLine}` : trimmedLine)
    } else {
      processedLines.push(`${basePath}${trimmedLine}`)
    }
  }

  return processedLines.join('\n')
}
