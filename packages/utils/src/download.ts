/**
 * Browser file download utilities.
 *
 * - `downloadFile` — trigger a single-file download from a Blob / URL.
 * - `downloadFilesAsZip` — bundle multiple files into a ZIP via JSZip and download.
 */

import { format } from 'date-fns'

export interface DownloadFileOptions {
  /** Blob, File, or object-URL to download. */
  data: Blob | string
  /** Suggested file name (including extension). */
  filename: string
}

/**
 * Trigger a browser download for a single file.
 *
 * Accepts either a `Blob` (will be wrapped with `URL.createObjectURL`) or an
 * existing object-URL string.
 */
export function downloadFile({ data, filename }: DownloadFileOptions): void {
  const url = typeof data === 'string' ? data : URL.createObjectURL(data)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Only revoke URLs we created ourselves.
  if (typeof data !== 'string') {
    URL.revokeObjectURL(url)
  }
}

export interface ZipFileEntry {
  /** Path inside the ZIP (e.g. `"audio/hello.mp3"`). */
  path: string
  /** File content. */
  data: Blob | ArrayBuffer | Uint8Array | string
}

/**
 * Bundle multiple files into a ZIP archive and trigger a browser download.
 *
 * ZIP filename convention: `{prefix}_yyyyMMdd_HHmmss.zip`
 *
 * Dynamically imports `jszip` so the library is only loaded when actually
 * needed (keeps the main bundle lean for consumers that never call this).
 *
 * @param files   - Array of files to include in the ZIP.
 * @param prefix  - Project name used as the ZIP filename prefix.
 */
export async function downloadFilesAsZip(
  files: ZipFileEntry[],
  prefix: string,
): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  for (const file of files) {
    zip.file(file.path, file.data)
  }

  const zipFilename = `${prefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.zip`
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadFile({ data: blob, filename: zipFilename })
}
