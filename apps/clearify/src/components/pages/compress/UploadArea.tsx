import { Button } from '@cdlab996/ui/components/button'
import { formatFileSize } from '@cdlab996/utils'
import { FileVideo, Loader2, Upload, X } from 'lucide-react'
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone'
import { IKMediaUpload } from '@/components/IK'

interface UploadAreaProps {
  video: File | null
  previewUrl: string
  isLoading: boolean
  isProcessing: boolean
  isReady: boolean
  error: string | null
  outputUrl: string
  getRootProps: () => DropzoneRootProps
  getInputProps: () => DropzoneInputProps
  isDragActive: boolean
  isDragAccept: boolean
  isDragReject: boolean
  onRetryLoad: () => void
  onReset: () => void
  onCompress: () => void
}

export function UploadArea({
  video,
  previewUrl,
  isLoading,
  isProcessing,
  isReady,
  error,
  outputUrl,
  getRootProps,
  getInputProps,
  isDragActive,
  isDragAccept,
  isDragReject,
  onRetryLoad,
  onReset,
  onCompress,
}: UploadAreaProps) {
  return (
    <div className="space-y-4">
      {/* Upload Area or Video Preview */}
      {!video ? (
        <IKMediaUpload
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
          isDragAccept={isDragAccept}
          isDragReject={isDragReject}
          isDisabled={isLoading}
          isLoading={isLoading}
          loadingText="Loading video processor..."
          errorText={error || undefined}
          errorActions={
            error ? (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onRetryLoad()
                }}
                size="sm"
              >
                Retry Loading
              </Button>
            ) : undefined
          }
          acceptedFormats="MP4, MOV, AVI, etc."
          title="Upload Video"
          description="Drag & drop or click to select"
        />
      ) : (
        <div className="space-y-3 border border-dashed rounded-md bg-[#1a1b2e]/40 backdrop-blur-md p-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={previewUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2 px-1">
            <FileVideo className="size-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{video.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(video.size)}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              disabled={isProcessing}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Compress Button */}
      {video && !isProcessing && !outputUrl && (
        <Button
          onClick={onCompress}
          className="w-full"
          disabled={!isReady || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <Upload className="size-4" />
              <span>Compress Video</span>
            </>
          )}
        </Button>
      )}
    </div>
  )
}
