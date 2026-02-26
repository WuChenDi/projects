'use client'

import { IKMediaUpload } from '@/components/IK'
import { SampleImages } from '@/components/pages/squish'
import type { BgError, ModelStatus, RemovalModel } from '@/types'
import { ModelSelector } from './ModelSelector'

interface LeftPanelProps {
  currentModel: RemovalModel
  modelStatus: ModelStatus
  isModelInitialized: boolean
  isModelSwitching: boolean
  isIOS: boolean
  isLoading: boolean
  error: BgError | null
  getRootProps: any
  getInputProps: any
  isDragActive: boolean
  isDragAccept: boolean
  isDragReject: boolean
  errorActions?: React.ReactNode
  onModelChange: (model: RemovalModel) => void
  onSampleImageClick: (url: string) => void
}

export const LeftPanel = ({
  currentModel,
  modelStatus,
  isModelInitialized,
  isModelSwitching,
  isIOS,
  isLoading,
  error,
  getRootProps,
  getInputProps,
  isDragActive,
  isDragAccept,
  isDragReject,
  errorActions,
  onModelChange,
  onSampleImageClick,
}: LeftPanelProps) => (
  <div className="space-y-6">
    {/* Model Selection */}
    <ModelSelector
      currentModel={currentModel}
      modelStatus={modelStatus}
      isModelInitialized={isModelInitialized}
      isModelSwitching={isModelSwitching}
      isIOS={isIOS}
      onModelChange={onModelChange}
    />

    {/* Upload Zone */}
    <IKMediaUpload
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      isDragActive={isDragActive}
      isDragAccept={isDragAccept}
      isDragReject={isDragReject}
      isDisabled={isModelSwitching}
      isLoading={isLoading}
      loadingText={isModelSwitching ? 'Switching models...' : 'Loading model...'}
      errorText={error?.message}
      errorActions={errorActions}
      acceptedFormats="JPEG, PNG, WebP"
    />

    {/* Sample Images */}
    <SampleImages onSampleImageClick={onSampleImageClick} />
  </div>
)
