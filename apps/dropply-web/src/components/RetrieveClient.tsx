'use client'

import { Badge } from '@cdlab996/ui/components/badge'
import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { cn } from '@cdlab996/ui/lib/utils'
import GradientText from '@cdlab996/ui/reactbits/GradientText'
import { formatFileSize } from '@cdlab996/utils'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  Download,
  File,
  FileText,
  Loader2,
  Upload,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePocketChest } from '@/hooks/usePocketChest'
import { PocketChestAPI } from '@/lib'
import type { FileInfo } from '@/types'

interface FileWithContent extends FileInfo {
  content?: string
  blob?: Blob
}

interface RetrieveClientProps {
  code: string
  onBack?: () => void
}

export function RetrieveClient({ code, onBack }: RetrieveClientProps) {
  const [files, setFiles] = useState<FileWithContent[]>([])
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [chestToken, setChestToken] = useState<string>('')
  const [hasRetrieved, setHasRetrieved] = useState(false)
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null)

  const { retrieve, downloadSingleFile, isRetrieving, error, clearError } =
    usePocketChest()
  const api = new PocketChestAPI()

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (code && !hasRetrieved) {
      void handleRetrieve()
    }
  }, [code, hasRetrieved])

  const handleRetrieve = async () => {
    if (!code) return

    try {
      const result = await retrieve(code)
      // @ts-expect-error
      setFiles(result.files)
      setExpiryDate(result.expiryDate || '')
      setChestToken(result.chestToken)
      setHasRetrieved(true)
    } catch (error) {
      console.error('Retrieval failed:', error)
    }
  }

  const handleDownload = async (file: FileWithContent) => {
    try {
      await downloadSingleFile(file.fileId, chestToken, file.filename)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }

  const copyTextToClipboard = (content: string, fileId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedFileId(fileId)
    setTimeout(() => setCopiedFileId(null), 2000)
  }

  if (isRetrieving) {
    return (
      <div className="w-full max-w-4xl space-y-12 relative flex items-center justify-center min-h-[400px]">
        <Card className="border-none bg-card/30 backdrop-blur-xl shadow-lg max-w-md mx-auto">
          <CardContent className="p-12 text-center">
            <div className="space-y-6">
              <Loader2
                size={48}
                className="mx-auto text-primary animate-spin"
              />
              <div>
                <CardTitle className="text-2xl mb-2">
                  Retrieving files...
                </CardTitle>
                <p className="text-muted-foreground">
                  Please wait while we fetch your content
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl space-y-12 relative flex items-center justify-center min-h-[400px]">
        <Card className="border-none bg-card/30 backdrop-blur-xl shadow-lg max-w-md mx-auto">
          <CardContent className="p-12 text-center">
            <div className="space-y-6">
              <AlertCircle size={48} className="mx-auto text-red-500" />
              <div>
                <CardTitle className="text-2xl text-red-600 mb-2">
                  Retrieval Failed
                </CardTitle>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button
                  onClick={() => (window.location.href = '/')}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-none"
                >
                  Go Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl space-y-6 relative">
      {/* Header */}
      <div className="text-center">
        <GradientText className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r mb-6">
          Retrieved Content
        </GradientText>
        <div className="flex items-center justify-center mt-6 gap-4">
          <p className="text-base md:text-lg text-muted-foreground mb-2">
            Retrieval Code:
          </p>
          <code className="text-xl md:text-2xl font-mono font-bold text-primary bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-border/50">
            {code}
          </code>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-8">
          {/* Text Content Section */}
          {files.some((f) => f.isText) && (
            <Card className="border-none bg-card/30 backdrop-blur-xl shadow-lg">
              <CardHeader className="border-b border-border/20 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Text Content</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {files.filter((f) => f.isText).length} text item(s)
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files
                    .filter((f) => f.isText)
                    .map((file) => {
                      const displayName = file.filename.endsWith('.txt')
                        ? file.filename.slice(0, -4)
                        : file.filename
                      return (
                        <div
                          key={file.fileId}
                          className="p-4 rounded-lg border border-border/30 bg-background/30 backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                              <FileText
                                size={14}
                                className="text-emerald-600 dark:text-emerald-400"
                              />
                            </div>
                            <h3 className="font-semibold text-sm truncate flex-1">
                              {displayName}
                            </h3>
                          </div>

                          <p className="text-xs text-muted-foreground mb-3">
                            {formatFileSize(file.size)}
                          </p>

                          {file.content && (
                            <div className="space-y-3">
                              <div className="bg-muted/30 rounded-md p-3 max-h-32 overflow-y-auto border border-border/20">
                                <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                                  {file.content}
                                </pre>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() =>
                                    copyTextToClipboard(
                                      file.content!,
                                      file.fileId,
                                    )
                                  }
                                  size="sm"
                                  variant={
                                    copiedFileId === file.fileId
                                      ? 'default'
                                      : 'outline'
                                  }
                                  className={cn(
                                    'flex-1 text-xs',
                                    copiedFileId === file.fileId &&
                                      'bg-emerald-500 hover:bg-emerald-600',
                                  )}
                                >
                                  {copiedFileId === file.fileId ? (
                                    <>
                                      <CheckCircle size={12} className="mr-1" />{' '}
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} className="mr-1" /> Copy
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleDownload(file)}
                                  size="sm"
                                  className="flex-1 text-xs bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                                >
                                  <Download size={12} className="mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files Section */}
          {files.some((f) => !f.isText) && (
            <Card className="border-none bg-card/30 backdrop-blur-xl shadow-lg">
              <CardHeader className="border-b border-border/20 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg">
                      <File size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        Files ({files.filter((f) => !f.isText).length})
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={14} className="text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Expires: {formatDate(expiryDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {files
                    .filter((f) => !f.isText)
                    .map((file) => (
                      <div
                        key={file.fileId}
                        className="p-4 rounded-lg border border-border/30 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                              <File
                                size={16}
                                className="text-purple-600 dark:text-purple-400"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">
                                {file.filename}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(file.size)}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {file.mimeType
                                    ?.split('/')[1]
                                    ?.toUpperCase() || 'FILE'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleDownload(file)}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-none"
                          >
                            <Download size={16} />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80"
          >
            <ArrowLeft size={16} />
            Enter Another Code
          </Button>
        )}
        <Button
          onClick={() => (window.location.href = '/')}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        >
          <Upload size={16} />
          Upload Files
        </Button>
      </div>
    </div>
  )
}
