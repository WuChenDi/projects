import type { ReactNode } from 'react'
import { useMemo } from 'react'

export enum StatusEnum {
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

export interface IKAssetRendererProps {
  status: StatusEnum
  renderLoading: () => ReactNode
  renderFailure: () => ReactNode
  renderSuccess: () => ReactNode
}

export function IKAssetRenderer({
  status,
  renderLoading,
  renderFailure,
  renderSuccess,
}: IKAssetRendererProps) {
  const content = useMemo(() => {
    switch (status) {
      case StatusEnum.PROCESSING:
        return renderLoading()
      case StatusEnum.FAILED:
        return renderFailure()
      case StatusEnum.COMPLETED:
        return renderSuccess()
      default:
        console.warn(`Unknown asset status: ${status}`)
        return null
    }
  }, [status, renderLoading, renderFailure, renderSuccess])

  return <>{content}</>
}
