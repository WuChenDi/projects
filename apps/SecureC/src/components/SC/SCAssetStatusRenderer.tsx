import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { logger } from '@/lib'
import { StatusEnum } from '@/types'

export interface SCAssetStatusRendererProps {
  status: StatusEnum
  renderLoading: () => ReactNode
  renderFailure: () => ReactNode
  renderSuccess: () => ReactNode
}

export function SCAssetStatusRenderer({
  status,
  renderLoading,
  renderFailure,
  renderSuccess,
}: SCAssetStatusRendererProps) {
  const content = useMemo(() => {
    switch (status) {
      case StatusEnum.PROCESSING:
        return renderLoading()
      case StatusEnum.FAILED:
        return renderFailure()
      case StatusEnum.COMPLETED:
        return renderSuccess()
      default:
        logger.warn(`Unknown asset status: ${status}`)
        return null
    }
  }, [status, renderLoading, renderFailure, renderSuccess])

  return <>{content}</>
}
