'use client'

import { IKMediaUpload } from '@/components/IK'
import type {
  CompressionOptions as CompressionOptionsType,
  OutputType,
} from '@/types'
import { CompressionOptions } from './CompressionOptions'
import { SampleImages } from './SampleImages'

interface LeftPanelProps {
  outputType: OutputType
  options: CompressionOptionsType
  onOutputTypeChange: (type: OutputType) => void
  onQualityChange: (value: number) => void
  getRootProps: any
  getInputProps: any
  isDragActive: boolean
  isDragAccept: boolean
  isDragReject: boolean
  hasImages: boolean
  onSampleImageClick: (url: string) => void
}

export const LeftPanel = ({
  outputType,
  options,
  onOutputTypeChange,
  onQualityChange,
  getRootProps,
  getInputProps,
  isDragActive,
  isDragAccept,
  isDragReject,
  onSampleImageClick,
}: LeftPanelProps) => (
  <div className="space-y-6">
    {/* Compression Options */}
    <CompressionOptions
      outputType={outputType}
      options={options}
      onOutputTypeChange={onOutputTypeChange}
      onQualityChange={onQualityChange}
    />

    {/* Upload Area */}
    <IKMediaUpload
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      isDragActive={isDragActive}
      isDragAccept={isDragAccept}
      isDragReject={isDragReject}
      acceptedFormats="JPEG, PNG, WebP, AVIF, JXL"
    />

    {/* Sample Images */}
    <SampleImages onSampleImageClick={onSampleImageClick} />
  </div>
)
