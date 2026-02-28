'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { cn } from '@cdlab996/ui/lib/utils'
import GradientText from '@cdlab996/ui/reactbits/GradientText'
import ShinyText from '@cdlab996/ui/reactbits/ShinyText'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  FileText,
  Mail,
  Upload,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EmailShare } from '@/components/EmailShare'
import { ExpirySelector } from '@/components/ExpirySelector'
import { FileUpload } from '@/components/FileUpload'
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // First, fetch server configuration
        const config = await api.getConfig()
        setRequireTOTP(config.requireTOTP)
        setEmailShareEnabled(config.emailShareEnabled)
        setConfigLoaded(true)

        // Then initialize session based on config
        if (config.requireTOTP) {
          setShowTOTPModal(true)
        } else {
          // No TOTP required, create session immediately
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
        // Show error state or fallback
      } finally {
        setIsAuthenticating(false)
      }
    }

    // biome-ignore lint/nursery/noFloatingPromises: <explanation>
    initializeApp()
  }, [])

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
      throw error // Re-throw to let modal handle UI state
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleTOTPClose = () => {
    // Don't allow closing if TOTP is required - they need to authenticate
    if (requireTOTP && !isAuthenticated) {
      return
    }
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

    // Scroll to top to show upload progress
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Fallback for older browsers
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    }, 100)

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
      // Error is handled by the uploadProgress component
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
    // Reset local page state
    setUploadResult(null)
    setCopied(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show loading state until config is loaded and authentication is complete
  if (!configLoaded || (requireTOTP && !isAuthenticated) || isAuthenticating) {
    return (
      <div className="w-full max-w-4xl space-y-12 relative">
        <div className="text-center mb-8">
          <GradientText className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r">
            Share Files & Text
          </GradientText>

          <div className="mt-6">
            <ShinyText
              text="Upload files or text to get a shareable code"
              disabled={false}
              speed={3}
              className="text-base md:text-lg text-gray-600 dark:text-gray-300"
            />
          </div>
        </div>

        <Card
          className={cn(
            'relative border-none bg-card/30 backdrop-blur-xl shadow-lg rounded-xl overflow-hidden max-w-2xl mx-auto',
            'transition-all duration-300',
          )}
        >
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">
                {!configLoaded ? '🎯' : requireTOTP ? '🔐' : '⏳'}
              </div>

              <div>
                <CardTitle className="text-2xl mb-3 tracking-tight">
                  {!configLoaded
                    ? 'Opening the Chest...'
                    : requireTOTP
                      ? 'Authentication Required'
                      : 'Preparing Session'}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {!configLoaded
                    ? 'Checking what treasures await inside! 🗝️✨'
                    : requireTOTP
                      ? 'Please authenticate with your TOTP code to proceed'
                      : 'Setting up your upload session...'}
                </CardDescription>
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

        {/* TOTP Modal */}
        <TOTPModal
          isOpen={showTOTPModal}
          onClose={handleTOTPClose}
          onSubmit={handleTOTPSubmit}
          error={totpError}
          allowCancel={false}
        />
      </div>
    )
  }

  if (uploadResult) {
    return (
      <div className="w-full max-w-4xl space-y-12 relative">
        <div className="text-center mb-8">
          <GradientText className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r">
            Upload Successful!
          </GradientText>
          <div className="mt-6">
            <ShinyText
              text="Your files are ready to share!"
              disabled={false}
              speed={3}
              className="text-base md:text-lg text-gray-600 dark:text-gray-300"
            />
          </div>
        </div>

        <Card
          className={cn(
            'relative border-none bg-card/30 backdrop-blur-xl shadow-lg rounded-xl overflow-hidden max-w-2xl mx-auto',
            'transition-all duration-300',
          )}
        >
          <CardContent className="p-12">
            <div className="text-center space-y-8">
              <div className="text-6xl">✅</div>

              <div>
                <CardTitle className="text-2xl text-emerald-600 mb-3 tracking-tight">
                  Files Shared Successfully
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Your files are uploaded and ready to share!
                </CardDescription>
              </div>

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
                  <code className="text-2xl md:text-3xl font-mono font-bold text-primary bg-background/80 backdrop-blur-sm px-6 py-3 rounded-xl border border-border/50 shadow-sm">
                    {uploadResult}
                  </code>
                  <Button
                    onClick={() => copyToClipboard(uploadResult)}
                    variant="outline"
                    size="icon"
                    className={cn(
                      'h-12 w-12 border border-border/50 transition-all duration-200 backdrop-blur-sm',
                      copied
                        ? 'text-emerald-600 bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/50'
                        : 'hover:bg-background/80 hover:border-primary/40',
                    )}
                  >
                    {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recipients can use this code at{' '}
                  <span className="font-mono">
                    {window.location.origin}/retrieve
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => {
                    setUploadResult(null)
                    clearError()
                  }}
                  className={cn(
                    'flex-1 border-none text-white font-semibold shadow-lg rounded-xl h-12',
                    'transition-all duration-300 hover:shadow-xl hover:scale-[1.02]',
                    'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600',
                  )}
                >
                  <Upload size={16} />
                  Share More Files
                </Button>

                {emailShareEnabled && (
                  <Button
                    onClick={() => setShowEmailShare(true)}
                    variant="outline"
                    className="flex-1 h-12 border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 rounded-xl"
                  >
                    <Mail size={16} />
                    Share via Email
                  </Button>
                )}

                <Button
                  asChild
                  variant="outline"
                  className="flex-1 h-12 border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 rounded-xl"
                >
                  <Link href="/">
                    <ArrowLeft size={16} />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Share Modal */}
        <EmailShare
          retrievalCode={uploadResult}
          isVisible={showEmailShare}
          onClose={() => setShowEmailShare(false)}
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl space-y-12 relative">
      <div className="text-center mb-8">
        <GradientText className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r mb-6">
          Share Files & Text
        </GradientText>

        <div className="mt-6">
          <ShinyText
            text="Upload files or text to get a shareable code"
            disabled={false}
            speed={3}
            className="text-base md:text-lg text-gray-600 dark:text-gray-300"
          />
        </div>
      </div>

      {error && (
        <Card className="border border-red-200/50 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800/50 backdrop-blur-sm max-w-2xl mx-auto">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
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
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
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

      {/* Single Card containing everything */}
      <Card
        className={cn(
          'relative border-none bg-card/30 backdrop-blur-xl shadow-lg rounded-xl overflow-hidden',
          'transition-all duration-300 hover:shadow-xl',
        )}
      >
        <CardContent className="p-8 space-y-8">
          {/* Text Section */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div
                className={cn(
                  'p-3 rounded-xl text-white shadow-lg',
                  'bg-gradient-to-r from-emerald-500 to-teal-500',
                )}
              >
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Text Content</h3>
                <p className="text-sm text-muted-foreground">
                  Add text snippets to share
                </p>
              </div>
            </div>
            <TextInput textItems={textItems} onTextItemsChange={setTextItems} />
          </div>

          {/* Files Section */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div
                className={cn(
                  'p-3 rounded-xl text-white shadow-lg',
                  'bg-gradient-to-r from-purple-500 to-blue-500',
                )}
              >
                <Upload size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Files</h3>
                <p className="text-sm text-muted-foreground">
                  Upload files to share
                </p>
              </div>
            </div>
            <FileUpload files={files} onFilesChange={setFiles} />
          </div>

          {/* Settings Section */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div
                className={cn(
                  'p-3 rounded-xl text-white shadow-lg',
                  'bg-gradient-to-r from-amber-500 to-orange-500',
                )}
              >
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Settings & Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Configure expiry and share your content
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <ExpirySelector value={validityDays} onChange={setValidityDays} />

              <Button
                onClick={handleUpload}
                disabled={
                  isUploading || (files.length === 0 && textItems.length === 0)
                }
                className={cn(
                  'w-full border-none text-white font-semibold shadow-lg rounded-xl h-12',
                  'transition-all duration-300 hover:shadow-xl hover:scale-[1.02]',
                  'bg-gradient-to-r from-purple-500 to-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                )}
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin">⏳</div>
                    Uploading...
                  </span>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Upload & Generate Code</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
