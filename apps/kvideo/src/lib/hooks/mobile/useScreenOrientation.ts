import { useEffect } from 'react'

/**
 * Hook for managing screen orientation on mobile devices
 * Auto-rotates to landscape on fullscreen, portrait on exit
 */
export function useScreenOrientation(isFullscreen: boolean) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('screen' in window)) return

    const handleOrientation = async () => {
      try {
        const screen = window.screen as any

        if (isFullscreen) {
          // Fullscreen: Lock to landscape
          if (screen.orientation?.lock) {
            await screen.orientation.lock('landscape').catch((err: any) => {
              console.warn('Could not lock orientation:', err)
            })
          }
        } else {
          // Exit fullscreen: Unlock to allow portrait
          if (screen.orientation?.unlock) {
            screen.orientation.unlock()
          }
        }
      } catch (error) {
        console.warn('Orientation API not supported:', error)
      }
    }

    void handleOrientation()

    // Cleanup: Always unlock on unmount
    return () => {
      try {
        const screen = window.screen as any
        if (screen.orientation?.unlock) {
          screen.orientation.unlock()
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [isFullscreen])
}
