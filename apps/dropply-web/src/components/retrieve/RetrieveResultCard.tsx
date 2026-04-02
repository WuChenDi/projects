'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@cdlab996/ui/components/card'
import { cn } from '@cdlab996/ui/lib/utils'
import { copyToClipboard } from '@cdlab996/utils'
import { formatBytes } from '@cdlab996/utils'
import {
  CheckCircle,
  Clock,
  Copy,
  Download,
  File,
  FileText,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { RetrieveResult } from '@/store/useRetrieveStore'

interface RetrieveResultCardProps {
  result: RetrieveResult
  onDownload: (
    fileId: string,
    chestToken: string,
    filename: string,
    encryptionKey: string,
  ) => void
  onRemove: (id: string) => void
}

export function RetrieveResultCard({
  result,
  onDownload,
  onRemove,
}: RetrieveResultCardProps) {
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null)

  const textFiles = result.files.filter((f) => f.isText)
  const binaryFiles = result.files.filter((f) => !f.isText)
  const isExpired =
    !!result.expiryDate && new Date(result.expiryDate) < new Date()

  const handleCopyText = async (content: string, fileId: string) => {
    await copyToClipboard(content)
    setCopiedFileId(fileId)
    setTimeout(() => setCopiedFileId(null), 2000)
  }

  return (
    <Card
      className={cn(
        'relative border',
        'bg-gradient-to-br from-emerald-50/30 to-teal-50/30 border-emerald-200/30',
        'dark:from-emerald-950/10 dark:to-teal-950/10 dark:border-emerald-800/20',
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-primary shrink-0" />
            <code className="font-mono font-bold text-primary text-lg">
              {result.retrievalCode}
            </code>
            {result.expiryDate && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isExpired ? 'text-red-500' : 'text-muted-foreground',
                )}
              >
                <Clock size={12} />
                {isExpired
                  ? 'Expired'
                  : new Date(result.expiryDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
            onClick={() => onRemove(result.id)}
          >
            <X size={14} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {textFiles.map((file) => {
          const displayName = file.filename.endsWith('.txt')
            ? file.filename.slice(0, -4)
            : file.filename
          return (
            <div
              key={file.fileId}
              className="p-3 rounded-lg border border-border/30 bg-background/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-emerald-500" />
                <span className="text-sm font-medium truncate flex-1">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes({ bytes: file.size })}
                </span>
              </div>
              {file.content && (
                <>
                  <div className="bg-muted/50 rounded-md p-2 max-h-24 overflow-y-auto border border-border/30 mb-2">
                    <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                      {file.content}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCopyText(file.content!, file.fileId)}
                      size="sm"
                      variant="outline"
                      className={cn(
                        'flex-1 text-xs',
                        copiedFileId === file.fileId &&
                          'text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30',
                      )}
                    >
                      {copiedFileId === file.fileId ? (
                        <>
                          <CheckCircle size={12} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() =>
                        onDownload(
                          file.fileId,
                          result.chestToken,
                          file.filename,
                          result.encryptionKey,
                        )
                      }
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={isExpired}
                    >
                      <Download size={12} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )
        })}
        {binaryFiles.map((file) => (
          <div
            key={file.fileId}
            className="p-3 rounded-lg border border-border/30 bg-background/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <File size={14} className="text-purple-500" />
              <span className="text-sm font-medium truncate">
                {file.filename}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatBytes({ bytes: file.size })}
              </span>
            </div>
            <Button
              onClick={() =>
                onDownload(
                  file.fileId,
                  result.chestToken,
                  file.filename,
                  result.encryptionKey,
                )
              }
              size="sm"
              variant="outline"
              className="text-xs ml-2"
              disabled={isExpired}
            >
              <Download size={12} />
              {isExpired ? 'Expired' : 'Download'}
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          {new Date(result.timestamp).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}
