/**
 * M3U8 Ad Filtering & URL Normalization
 *
 * Multi-layered ad removal pipeline for HLS playlists:
 *
 *   1. Heuristic block analysis — score each DISCONTINUITY-delimited block
 *      against the main-content fingerprint (see m3u8-ad-detector.ts)
 *   2. CUE tag state machine — strip SCTE-35 CUE-OUT/CUE-IN ad sections
 *   3. Keyword backtracking — remove segments whose URL matches ad keywords,
 *      plus their preceding #EXTINF and #EXT-X-DISCONTINUITY lines
 *   4. Aggressive DISCONTINUITY stripping — in aggressive mode, remove ALL
 *      DISCONTINUITY tags to handle "perfect camouflage" ads
 *   5. URL normalization — resolve relative URLs to absolute for Blob playback
 */

import {
  learnMainPattern,
  parseBlocks,
  scoreBlock,
  shouldFilterBlock,
} from './m3u8-ad-detector'

export type AdFilterMode = 'off' | 'keyword' | 'heuristic' | 'aggressive'

/**
 * Filter ads from M3U8 content and normalize URLs.
 *
 * @param content   Raw M3U8 playlist string
 * @param baseUrl   URL of the M3U8 file (used to resolve relative paths)
 * @param mode      Filtering strategy: off / keyword / heuristic / aggressive
 * @param customKeywords  Additional URL keywords to match (from env or user settings)
 * @returns Filtered M3U8 content with absolute URLs
 */
export function filterM3u8Ad(
  content: string,
  baseUrl: string,
  mode: AdFilterMode = 'heuristic',
  customKeywords: string[] = [],
): string {
  if (!content) return ''

  const keywords = customKeywords

  // Derive base path and origin for URL resolution
  const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)
  let origin = ''
  try {
    origin = new URL(baseUrl).origin
  } catch (e) {
    /* ignore */
  }

  // Quick-scan: check whether keywords or CUE tags appear anywhere in the content
  const hasKeywordMatch =
    mode !== 'off' && keywords.some((k) => content.includes(k))
  const hasCueTag =
    mode !== 'off' &&
    (content.includes('#EXT-X-CUE-OUT') || content.includes('#EXT-X-CUE-IN'))

  // ── Step 1: Heuristic block analysis ──
  // Run when there are no CUE tags (CUE tags are handled later by the state machine)
  const lines = content.split(/\r?\n/)
  let adLineIndices = new Set<number>()

  if (!hasCueTag && (mode === 'heuristic' || mode === 'aggressive')) {
    const blocks = parseBlocks(lines)
    if (blocks.length > 1) {
      const mainPattern = learnMainPattern(blocks)
      for (const block of blocks) {
        const score = scoreBlock(block, mainPattern, keywords)
        const threshold = mode === 'aggressive' ? 3.0 : 5.0
        if (shouldFilterBlock(score, threshold)) {
          for (const segment of block.segments) {
            adLineIndices.add(segment.lineIndex)
            adLineIndices.add(segment.lineIndex - 1) // corresponding #EXTINF line
          }
        }
      }
    }
  }

  // ── Step 2–5: Line-by-line processing ──
  const processedLines: string[] = []
  let insideCueAdBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Skip lines already flagged by heuristic analysis (Step 1)
    if (adLineIndices.has(i)) {
      continue
    }

    // ── Step 2: CUE tag state machine (SCTE-35) ──
    // CUE-OUT opens an ad section; CUE-IN closes it
    if (mode !== 'off' && trimmedLine.startsWith('#EXT-X-CUE-OUT')) {
      insideCueAdBlock = true
      // Remove the preceding DISCONTINUITY if present
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
      // Skip the trailing DISCONTINUITY that closes the ad section
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

    // ── Step 3: Keyword backtracking ──
    // When a segment URL matches a keyword, remove it and backtrack to strip
    // associated #EXTINF and #EXT-X-DISCONTINUITY lines
    if (
      keywords.length > 0 &&
      hasKeywordMatch &&
      keywords.some((keyword) => trimmedLine.includes(keyword))
    ) {
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

    // ── Step 4: DISCONTINUITY handling ──
    // Aggressive mode strips ALL DISCONTINUITY tags — this handles sources where
    // ad segments share the same CDN, path, filename pattern, and duration as
    // main content, making the DISCONTINUITY marker the only remaining signal.
    // Removing them prevents the player from reinitializing the decoder at splice
    // points, which eliminates the visible "jump" at ad boundaries.
    // Other modes keep DISCONTINUITY by default (only removed via backtracking above).
    if (trimmedLine === '#EXT-X-DISCONTINUITY') {
      if (mode !== 'aggressive') {
        processedLines.push(line)
      }
      continue
    }

    // ── Step 5: URL normalization ──
    // Convert relative URLs to absolute so Blob-based playback works correctly

    // Pass through empty lines and already-absolute URLs
    if (
      !trimmedLine ||
      trimmedLine.startsWith('http') ||
      trimmedLine.startsWith('blob:')
    ) {
      processedLines.push(line)
      continue
    }

    // HLS tags: resolve URI="..." attributes (e.g. #EXT-X-KEY)
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

    // Segment URLs: resolve root-relative and path-relative
    if (trimmedLine.startsWith('/')) {
      processedLines.push(origin ? `${origin}${trimmedLine}` : trimmedLine)
    } else {
      processedLines.push(`${basePath}${trimmedLine}`)
    }
  }

  return processedLines.join('\n')
}
