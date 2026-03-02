export type CopyOptions = {
  /** Whether to automatically fall back to legacy mode if the Clipboard API is unavailable or fails */
  fallbackToLegacy?: boolean
}

/**
 * Copies text to the clipboard with automatic fallback for legacy browsers / non-secure contexts
 * @param message - The text string to copy to the clipboard
 * @param opts - Optional configuration
 * @returns Promise resolving to whether the copy operation succeeded
 * @example
 * const success = await copyToClipboard('Hello World')
 * if (success) toast.success('Copied!')
 * else toast.error('Copy failed')
 */
export async function copyToClipboard(
  message: string,
  opts: CopyOptions = {},
): Promise<boolean> {
  const { fallbackToLegacy = true } = opts

  if (typeof message !== 'string' || message.length === 0) {
    console.warn('copyToClipboard: invalid message to copy:', message)
    return false
  }

  const tryLegacy = () => {
    try {
      return legacyCopy(message)
    } catch {
      return false
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message)
      return true
    }

    if (fallbackToLegacy) {
      return tryLegacy()
    }

    return false
  } catch (err) {
    console.error('copyToClipboard failed:', err)

    if (fallbackToLegacy) {
      const legacySuccess = tryLegacy()
      if (legacySuccess) return true
    }

    return false
  }
}

/**
 * Legacy fallback using deprecated document.execCommand('copy')
 * @param value - The text string to copy
 * @returns Whether the copy operation was successful
 */
function legacyCopy(value: string): boolean {
  const tempTextarea = document.createElement('textarea')
  tempTextarea.value = value
  tempTextarea.style.cssText =
    'position:fixed;opacity:0;left:-9999px;top:-9999px'
  tempTextarea.setAttribute('readonly', '')

  try {
    document.body.appendChild(tempTextarea)

    // iOS Safari requires special selection handling
    if (/ipad|iphone/i.test(navigator.userAgent)) {
      const range = document.createRange()
      range.selectNodeContents(tempTextarea)
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
      tempTextarea.setSelectionRange(0, value.length)
    } else {
      tempTextarea.select()
    }

    return document.execCommand('copy')
  } catch (error) {
    console.error('Legacy copy failed:', error)
    return false
  } finally {
    tempTextarea.remove()
  }
}
