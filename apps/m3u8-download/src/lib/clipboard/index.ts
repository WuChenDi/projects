import { toast } from 'sonner'

/**
 * Legacy fallback using deprecated document.execCommand('copy')
 * @param value - The text string to copy
 * @returns Whether the copy operation was successful
 */
function legacyCopy(value: string): boolean {
  const tempTextarea = document.createElement('textarea')
  tempTextarea.value = value
  tempTextarea.style.position = 'fixed'
  tempTextarea.style.opacity = '0'
  tempTextarea.style.left = '-9999px'
  tempTextarea.style.top = '-9999px'
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

/**
 * Copy text to clipboard with automatic fallback for older browsers
 * @param message - The text string to copy to the clipboard
 * @returns Promise that resolves to whether the copy operation was successful
 * @example
 * const success = await copyToClipboard('Hello World')
 * if (success) {
 *   console.log('Copied successfully')
 * }
 */
export async function copyToClipboard(message: string): Promise<boolean> {
  if (!message || typeof message !== 'string') {
    toast.error('Invalid text to copy')
    return false
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(message)
      toast.success('Text copied to clipboard!')
      return true
    } else {
      const legacySuccess = legacyCopy(message)

      if (legacySuccess) {
        toast.success('Text copied to clipboard!')
        return true
      } else {
        throw new Error('Legacy copy command failed.')
      }
    }
  } catch (error) {
    console.error('Failed to copy message:', error)
    toast.error('Failed to copy message')
    return false
  }
}
