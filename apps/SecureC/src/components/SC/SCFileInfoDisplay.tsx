import { formatFileSize } from '@cdlab996/utils'
import type { FileInfo } from '@/types'

interface SCFileInfoDisplayProps {
  fileInfo: FileInfo
}

export function SCFileInfoDisplay({ fileInfo }: SCFileInfoDisplayProps) {
  return (
    <div className="rounded-lg bg-gray-50/50 dark:bg-gray-800/30 p-3 sm:p-4 text-xs sm:text-sm space-y-3 sm:space-y-4 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            Filename
          </span>
          <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">
            {fileInfo.name}
          </p>
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            Size
          </span>
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            {formatFileSize(fileInfo.size)}
          </p>
        </div>
        {fileInfo.type && fileInfo.type !== 'Unknown' && (
          <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              Type
            </span>
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              {fileInfo.type}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
