function forceDownload(blobUrl: string, filename: string) {
  const a: HTMLAnchorElement = document.createElement('a')
  a.download = filename
  a.href = blobUrl
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function downloadPhoto(url: string, filename: string) {
  if (!filename) {
    filename = url.split('\\').pop()?.split('/').pop() ?? 'image'
  }
  fetch(url, { mode: 'cors' })
    .then((response) => response.blob())
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob)
      try {
        forceDownload(blobUrl, filename)
      } finally {
        window.URL.revokeObjectURL(blobUrl)
      }
    })
    .catch((e) => console.error(e))
}
