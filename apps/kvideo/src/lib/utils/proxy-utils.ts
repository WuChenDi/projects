/**
 * Extract and proxy URI from HLS tags like EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA
 */
function proxyUriInTag(line: string, base: URL, origin: string): string {
  const uriMatch = line.match(/URI="([^"]+)"/)
  if (uriMatch && uriMatch[1]) {
    const uri = uriMatch[1]
    // Skip if already proxied
    if (uri.includes('/api/proxy')) {
      return line
    }
    try {
      const absoluteUrl = new URL(uri, base).toString()
      const proxiedUrl = `${origin}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`
      return line.replace(/URI="[^"]+"/, `URI="${proxiedUrl}"`)
    } catch {
      return line
    }
  }
  return line
}

export async function processM3u8Content(
  content: string,
  baseUrl: string,
  origin: string,
): Promise<string> {
  const lines = content.split('\n')
  const base = new URL(baseUrl)

  const processedLines = lines.map((line) => {
    const trimmed = line.trim()

    // Handle EXT-X-KEY (encryption keys)
    if (trimmed.startsWith('#EXT-X-KEY:')) {
      return proxyUriInTag(trimmed, base, origin)
    }

    // Handle EXT-X-MAP (fMP4 initialization segments)
    if (trimmed.startsWith('#EXT-X-MAP:')) {
      return proxyUriInTag(trimmed, base, origin)
    }

    // Handle EXT-X-MEDIA (alternative audio/subtitle tracks)
    if (trimmed.startsWith('#EXT-X-MEDIA:')) {
      return proxyUriInTag(trimmed, base, origin)
    }

    // Handle EXT-X-STREAM-INF (master playlist variants)
    // The URL is on the NEXT line after this tag
    if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
      return line
    }

    // Skip other comments and empty lines
    if (trimmed.startsWith('#') || !trimmed) {
      return line
    }

    // Resolve relative URLs for segments and variant playlists
    // Skip if already proxied
    if (trimmed.includes('/api/proxy')) {
      return line
    }

    try {
      const absoluteUrl = new URL(trimmed, base).toString()
      return `${origin}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`
    } catch {
      return line
    }
  })

  return processedLines.join('\n')
}
