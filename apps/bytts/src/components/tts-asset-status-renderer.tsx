import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { HistoryItem } from '@/store/useHistoryStore'

interface TTSAssetStatusRendererProps {
  status: HistoryItem['status']
  renderLoading: () => ReactNode
  renderFailure: () => ReactNode
  renderSuccess: () => ReactNode
}

export function TTSAssetStatusRenderer({
  status,
  renderLoading,
  renderFailure,
  renderSuccess,
}: TTSAssetStatusRendererProps) {
  const content = useMemo(() => {
    switch (status) {
      case 'pending':
        return renderLoading()
      case 'failed':
        return renderFailure()
      case 'completed':
        return renderSuccess()
      default:
        return null
    }
  }, [status, renderLoading, renderFailure, renderSuccess])

  return <>{content}</>
}
