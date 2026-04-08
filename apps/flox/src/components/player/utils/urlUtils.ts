export function getCopyUrl(
  src: string,
  type: 'original' | 'proxy' = 'original',
): string {
  let urlToCopy = src

  // If user wants original link, strip proxy prefix if present
  if (type === 'original') {
    if (urlToCopy.includes('/api/proxy?url=')) {
      const match = urlToCopy.match(/url=([^&]*)/)
      if (match && match[1]) {
        urlToCopy = decodeURIComponent(match[1])
      }
    }
  }
  // If user wants proxy link, ensure it has proxy prefix
  else if (type === 'proxy') {
    if (!urlToCopy.includes('/api/proxy?url=')) {
      urlToCopy = `${window.location.origin}/api/proxy?url=${encodeURIComponent(urlToCopy)}`
    } else if (urlToCopy.startsWith('/')) {
      // Ensure absolute URL for copy
      urlToCopy = `${window.location.origin}${urlToCopy}`
    }
  }

  return urlToCopy
}

export function getProxyUrl(src: string): string {
  if (!src) return ''
  if (src.includes('/api/proxy')) return src

  // Handle server-side vs client-side origin
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/api/proxy?url=${encodeURIComponent(src)}`
}
