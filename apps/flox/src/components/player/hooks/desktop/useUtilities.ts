import { useCallback, useMemo } from 'react'

interface UseUtilitiesProps {
  src: string
  setToastMessage: (message: string | null) => void
  setShowToast: (show: boolean) => void
  toastTimeoutRef: React.RefObject<NodeJS.Timeout | null>
}

export function useUtilities({
  src,
  setToastMessage,
  setShowToast,
  toastTimeoutRef,
}: UseUtilitiesProps) {
  const showToastNotification = useCallback(
    (message: string) => {
      setToastMessage(message)
      setShowToast(true)

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }

      toastTimeoutRef.current = setTimeout(() => {
        setShowToast(false)
        setTimeout(() => setToastMessage(null), 300)
      }, 3000)
    },
    [setToastMessage, setShowToast, toastTimeoutRef],
  )

  const handleCopyLink = useCallback(
    async (url?: string) => {
      try {
        await navigator.clipboard.writeText(url || src)
        showToastNotification('链接已复制到剪贴板')
      } catch (error) {
        console.error('Copy failed:', error)
        showToastNotification('复制失败，请重试')
      }
    },
    [src, showToastNotification],
  )

  const utilityActions = useMemo(
    () => ({
      showToastNotification,
      handleCopyLink,
    }),
    [showToastNotification, handleCopyLink],
  )

  return utilityActions
}
