import { isMasterPlaylist, parseMasterPlaylistContent } from './m3u8-parser'
import type { VariantStream } from './video-utils'
import { fetchData, getFileExtension, isDirectVideoUrl } from './video-utils'

export interface BatchUrlMetadata {
  isDirectVideo: boolean
  directExt: string
  variants: VariantStream[]
  segmentCount: number
  estimatedSize: number | null
  /** The final URL to use for download (after variant resolution) */
  resolvedUrl: string
}

export const fetchUrlMetadata = async (
  inputUrl: string,
): Promise<BatchUrlMetadata> => {
  if (isDirectVideoUrl(inputUrl)) {
    let size: number | null = null
    try {
      const res = await fetch(inputUrl, { method: 'HEAD' })
      const len = res.headers.get('Content-Length')
      if (len) size = Number.parseInt(len, 10)
    } catch {
      // ignore
    }
    return {
      isDirectVideo: true,
      directExt: getFileExtension(inputUrl),
      variants: [],
      segmentCount: 0,
      estimatedSize: size,
      resolvedUrl: inputUrl,
    }
  }

  const m3u8Str: string = await fetchData(inputUrl)

  if (isMasterPlaylist(m3u8Str)) {
    const variants = parseMasterPlaylistContent(m3u8Str, inputUrl)
    if (variants.length > 0) {
      const bestUrl = variants[0].url
      try {
        const variantStr: string = await fetchData(bestUrl)
        const count = variantStr
          .split('\n')
          .filter((l) => /^[^#]/.test(l) && l.trim()).length
        return {
          isDirectVideo: false,
          directExt: '',
          variants,
          segmentCount: count,
          estimatedSize: null,
          resolvedUrl: bestUrl,
        }
      } catch {
        return {
          isDirectVideo: false,
          directExt: '',
          variants,
          segmentCount: 0,
          estimatedSize: null,
          resolvedUrl: bestUrl,
        }
      }
    }
  }

  const segments = m3u8Str
    .split('\n')
    .filter((l) => /^[^#]/.test(l) && l.trim())
  return {
    isDirectVideo: false,
    directExt: '',
    variants: [],
    segmentCount: segments.length,
    estimatedSize: null,
    resolvedUrl: inputUrl,
  }
}
