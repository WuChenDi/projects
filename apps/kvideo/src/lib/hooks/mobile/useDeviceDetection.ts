import { useEffect, useState } from 'react'

/**
 * Hook to detect if the device is mobile
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || window.innerWidth < 768
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

/**
 * Hook to detect if the device is iOS
 */
export function useIsIOS() {
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const checkIOS = () => {
      const ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as any).MSStream
      setIsIOS(ios)
    }

    checkIOS()
  }, [])

  return isIOS
}
