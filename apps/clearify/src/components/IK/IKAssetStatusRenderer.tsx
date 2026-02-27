import { logger } from '@cdlab996/utils'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { ImageFile } from '@/types'

export interface IKAssetStatusRendererProps {
  status: ImageFile['status']
  renderLoading: () => ReactNode
  renderFailure: () => ReactNode
  renderSuccess: () => ReactNode
}

export function IKAssetStatusRenderer({
  status,
  renderLoading,
  renderFailure,
  renderSuccess,
}: IKAssetStatusRendererProps) {
  const content = useMemo(() => {
    switch (status) {
      case 'pending':
      case 'queued':
      case 'processing':
        return renderLoading()
      case 'error':
        return renderFailure()
      case 'complete':
        return renderSuccess()
      default:
        logger.warn(`Unknown asset status: ${status}`)
        return null
    }
  }, [status, renderLoading, renderFailure, renderSuccess])

  return <>{content}</>
}
