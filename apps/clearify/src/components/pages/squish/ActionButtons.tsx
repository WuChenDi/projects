'use client'

import { Button } from '@cdlab996/ui/components/button'
import { cn } from '@cdlab996/ui/lib/utils'
import { Download, FileArchive, Loader2, Trash2 } from 'lucide-react'

interface ActionButtonsProps {
  completedImages: number
  totalImages: number
  handleDownloadAll: () => void
  handleDownloadZip: () => void
  handleClearAll: () => void
  isDownloading: boolean
  isZipping: boolean
}

export const ActionButtons = ({
  completedImages,
  totalImages,
  handleDownloadAll,
  handleDownloadZip,
  handleClearAll,
  isDownloading,
  isZipping,
}: ActionButtonsProps) => (
  <div className="flex flex-wrap gap-2">
    {completedImages > 0 && (
      <>
        <Button
          onClick={handleDownloadAll}
          disabled={isDownloading || isZipping}
          size="sm"
          variant="secondary"
          className={cn(
            (isDownloading || isZipping) &&
              'opacity-50 cursor-not-allowed pointer-events-none',
          )}
        >
          {isDownloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {isDownloading ? 'Downloading...' : 'Download All'}
        </Button>
        <Button
          onClick={handleDownloadZip}
          disabled={isZipping || isDownloading}
          size="sm"
          variant="secondary"
          className={cn(
            (isZipping || isDownloading) &&
              'opacity-50 cursor-not-allowed pointer-events-none',
          )}
        >
          {isZipping ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileArchive className="size-4" />
          )}
          {isZipping ? 'Creating...' : 'Download ZIP'}
        </Button>
      </>
    )}
    {totalImages > 0 && (
      <Button onClick={handleClearAll} size="sm" variant="secondary">
        <Trash2 className="size-4" />
        Clear All
      </Button>
    )}
  </div>
)
