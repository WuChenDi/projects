'use client'

import { cn } from '@cdlab996/ui/lib/utils'
import { AlertTriangle, Upload } from 'lucide-react'

interface IKMediaUploadProps {
  getRootProps: any
  getInputProps: any
  isDragActive: boolean
  isDragAccept: boolean
  isDragReject: boolean
  isDisabled?: boolean
  isLoading?: boolean
  loadingText?: string
  errorText?: string
  errorActions?: React.ReactNode
  acceptedFormats?: string
  title?: string
  description?: string
}

export const IKMediaUpload = ({
  getRootProps,
  getInputProps,
  isDragActive,
  isDragAccept,
  isDragReject,
  isDisabled = false,
  isLoading = false,
  loadingText = 'Loading...',
  errorText,
  errorActions,
  acceptedFormats = 'JPEG, PNG, WebP, AVIF, JXL',
  title = 'Upload Images',
  description = 'Drag & drop or click to select',
}: IKMediaUploadProps) => {
  const hasError = !!errorText

  return (
    <div
      {...getRootProps()}
      className={cn(
        'p-8 border border-dashed rounded-md text-center cursor-pointer transition-all duration-300',
        'bg-[#1a1b2e]/40 backdrop-blur-md',
        'hover:border-blue-500/80 hover:bg-blue-500/10',
        {
          'border-green-500/70 bg-green-500/10': isDragAccept && !isDisabled,
          'border-red-500/70 bg-red-500/10': isDragReject && !isDisabled,
          'border-blue-500/70 bg-blue-500/10': isDragActive && !isDisabled,
          'border-white/[0.1]':
            !isDragActive && !isDragAccept && !isDragReject && !hasError,
          'border-red-500/50 bg-red-500/5': hasError,
          'cursor-not-allowed opacity-60': isDisabled,
        },
      )}
    >
      <input {...getInputProps()} className="hidden" disabled={isDisabled} />
      <div className="flex flex-col items-center gap-3">
        {isLoading ? (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="text-base font-medium text-foreground/90">
              {loadingText}
            </p>
          </>
        ) : hasError ? (
          <>
            <AlertTriangle className="size-12 text-destructive" />
            <p className="text-sm text-destructive font-medium">{errorText}</p>
            {errorActions && <div className="mt-2">{errorActions}</div>}
          </>
        ) : (
          <>
            <Upload className="size-12 text-primary" />
            <p className="text-base font-medium text-foreground/90">
              {isDragActive ? 'Drop here...' : title}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground/70">
              {acceptedFormats}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
