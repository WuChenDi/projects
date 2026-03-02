'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Field } from '@cdlab996/ui/components/field'
import { Label } from '@cdlab996/ui/components/label'
import { cn } from '@cdlab996/ui/lib/utils'
import { copyToClipboard } from '@cdlab996/utils'
import { CheckCircle, Copy, Mail, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmailShare } from '@/components/EmailShare'
import { ExpirySelector } from '@/components/ExpirySelector'
import { FileUpload } from '@/components/FileUpload'
import { PageContainer } from '@/components/layout'
import { TextInput } from '@/components/TextInput'
import { TOTPModal } from '@/components/TOTPModal'
import { UploadProgress } from '@/components/UploadProgress'
import { usePocketChest } from '@/hooks/usePocketChest'
import { PocketChestAPI } from '@/lib'
import type { TextItem, ValidityDays } from '@/types'

export default function SharePage() {
  const [files, setFiles] = useState<File[]>([])
  const [textItems, setTextItems] = useState<TextItem[]>([])
  const [validityDays, setValidityDays] = useState<ValidityDays>(7)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [showTOTPModal, setShowTOTPModal] = useState(false)
  const [totpError, setTotpError] = useState<string>('')
  const [sessionData, setSessionData] = useState<{
    sessionId: string
    uploadToken: string
  } | null>(null)

  // Config state
  const [configLoaded, setConfigLoaded] = useState(false)
  const [requireTOTP, setRequireTOTP] = useState(false)
  const [emailShareEnabled, setEmailShareEnabled] = useState(false)

  // Email share state
  const [showEmailShare, setShowEmailShare] = useState(false)

  const {
    uploadWithSession,
    retryUpload,
    cancelUpload,
    isUploading,
    uploadProgress,
    uploadStatus,
    fileProgress,
    error,
    clearError,
  } = usePocketChest()
  const api = new PocketChestAPI()

  // Fetch config and initialize session
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const config = await api.getConfig()
        setRequireTOTP(config.requireTOTP)
        setEmailShareEnabled(config.emailShareEnabled)
        setConfigLoaded(true)

        if (config.requireTOTP) {
          setShowTOTPModal(true)
        } else {
          setIsAuthenticating(true)
          const session = await api.createChest()
          setSessionData({
            sessionId: session.sessionId,
            uploadToken: session.uploadToken,
          })
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        setIsAuthenticating(false)
      }
    }

    void initializeApp()
  }, [api.getConfig, api.createChest])

  const handleTOTPSubmit = async (totpToken: string) => {
    setTotpError('')
    setIsAuthenticating(true)
    try {
      const session = await api.createChest(totpToken)
      setSessionData({
        sessionId: session.sessionId,
        uploadToken: session.uploadToken,
      })
      setIsAuthenticated(true)
      setShowTOTPModal(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed'
      setTotpError(message)
      throw error
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleTOTPClose = () => {
    if (requireTOTP && !isAuthenticated) return
    setShowTOTPModal(false)
    setTotpError('')
  }

  const handleUpload = async () => {
    if (files.length === 0 && textItems.length === 0) {
      alert('Please add files or text to share')
      return
    }
    if (!sessionData) {
      alert('Session not ready. Please try again.')
      return
    }
    try {
      const result = await uploadWithSession(
        sessionData.sessionId,
        sessionData.uploadToken,
        files,
        textItems,
        validityDays,
      )
      setUploadResult(result.retrievalCode)
      setFiles([])
      setTextItems([])
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleRetry = async () => {
    if (!sessionData) return
    try {
      const result = await retryUpload(
        sessionData.sessionId,
        sessionData.uploadToken,
        files,
        textItems,
        validityDays,
      )
      setUploadResult(result.retrievalCode)
      setFiles([])
      setTextItems([])
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }

  const handleCancel = () => {
    cancelUpload()
    setUploadResult(null)
    setCopied(false)
  }

  const copy = async (text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Loading / auth state
  if (!configLoaded || (requireTOTP && !isAuthenticated) || isAuthenticating) {
    return (
      <PageContainer>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>
              {!configLoaded
                ? 'Opening the Chest...'
                : requireTOTP
                  ? 'Authentication Required'
                  : 'Preparing Session'}
            </CardTitle>
            <CardDescription>
              {!configLoaded
                ? 'Checking what treasures await inside! 🗝️✨'
                : requireTOTP
                  ? 'Please authenticate with your TOTP code to proceed'
                  : 'Setting up your upload session...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-6">
              <div className="text-6xl">
                {!configLoaded ? '🎯' : requireTOTP ? '🔐' : '⏳'}
              </div>
              {isAuthenticating && (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <div className="animate-spin">⏳</div>
                  <span className="font-medium">Authenticating...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <TOTPModal
          isOpen={showTOTPModal}
          onClose={handleTOTPClose}
          onSubmit={handleTOTPSubmit}
          error={totpError}
          allowCancel={false}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="w-full">
        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 p-4 rounded-lg border border-red-200/50 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/50">
            <p className="text-red-700 dark:text-red-300 font-medium">
              {error}
            </p>
            <Button
              onClick={clearError}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 h-auto p-1 hover:bg-red-100/50"
            >
              <X size={16} />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          {/* Left panel: all input & upload operations */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Share Files & Text</CardTitle>
              <CardDescription>
                Upload files or text to get a shareable code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Text snippets */}
              <TextInput
                textItems={textItems}
                onTextItemsChange={setTextItems}
              />

              {/* File upload */}
              <Field>
                <Label>Files</Label>
                <FileUpload files={files} onFilesChange={setFiles} />
              </Field>

              {/* Expiry settings */}
              <ExpirySelector value={validityDays} onChange={setValidityDays} />

              {/* Upload button */}
              <Button
                onClick={handleUpload}
                disabled={
                  isUploading || (files.length === 0 && textItems.length === 0)
                }
                className={cn(
                  'w-full border-none text-white',
                  'bg-gradient-to-r from-purple-500 to-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin">⏳</div>
                    Uploading...
                  </span>
                ) : (
                  <>
                    <Upload className="size-4" />
                    <span>Upload & Generate Code</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Right panel: results */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>
                {uploadResult
                  ? 'Upload Successful'
                  : isUploading
                    ? 'Uploading...'
                    : 'Result'}
              </CardTitle>
              <CardDescription>
                {uploadResult
                  ? 'Your files are ready to share'
                  : isUploading
                    ? 'Please wait while your files are being uploaded'
                    : 'Your upload result will appear here'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadResult ? (
                /* Success state */
                <div className="space-y-6">
                  <div className="text-center text-5xl">✅</div>

                  <div
                    className={cn(
                      'p-6 rounded-2xl border',
                      'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-200/30',
                      'dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800/30',
                    )}
                  >
                    <p className="text-sm font-medium text-muted-foreground mb-4">
                      Share this retrieval code:
                    </p>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <code className="text-2xl md:text-3xl font-mono font-bold text-primary bg-background/80 px-6 py-3 rounded-xl border border-border/50 shadow-sm">
                        {uploadResult}
                      </code>
                      <Button
                        onClick={() => copy(uploadResult)}
                        variant="outline"
                        size="icon"
                        className={cn(
                          'h-12 w-12 border border-border/50 transition-all duration-200',
                          copied
                            ? 'text-emerald-600 bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/50'
                            : 'hover:border-primary/40',
                        )}
                      >
                        {copied ? (
                          <CheckCircle size={20} />
                        ) : (
                          <Copy size={20} />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recipients can use this code at{' '}
                      <span className="font-mono">
                        {window.location.origin}/retrieve
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        setUploadResult(null)
                        clearError()
                      }}
                      className={cn(
                        'flex-1 border-none text-white font-semibold',
                        'bg-gradient-to-r from-purple-500 to-blue-500',
                      )}
                    >
                      <Upload className="size-4" />
                      Share More Files
                    </Button>

                    {emailShareEnabled && (
                      <Button
                        onClick={() => setShowEmailShare(true)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Mail className="size-4" />
                        Share via Email
                      </Button>
                    )}
                  </div>
                </div>
              ) : isUploading ? (
                /* Upload progress */
                <UploadProgress
                  files={files}
                  textItems={textItems}
                  isUploading={isUploading}
                  progress={uploadProgress}
                  fileProgress={fileProgress}
                  uploadStatus={uploadStatus}
                  error={error || undefined}
                  onRetry={handleRetry}
                  onCancel={handleCancel}
                />
              ) : (
                /* Idle placeholder */
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Upload size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add files or text on the left, then click upload
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EmailShare
        retrievalCode={uploadResult || ''}
        isVisible={showEmailShare}
        onClose={() => setShowEmailShare(false)}
      />
    </PageContainer>
  )
}
