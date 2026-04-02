'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { ShareForm } from '@/components/share/ShareForm'
import { ShareResults } from '@/components/share/ShareResults'
import { usePocketChest } from '@/hooks/usePocketChest'
import { generateEncryptionKey, genid, PocketChestAPI } from '@/lib'
import { useShareStore } from '@/store/useShareStore'
import type { TextItem, ValidityDays } from '@/types'

interface ShareTabProps {
  requireTOTP: boolean
  emailShareEnabled: boolean
  onUnlockTOTP: () => void
  isShareUnlocked: boolean
  totpToken: string | null
  onEmailShare: (code: string) => void
}

export function ShareTab({
  requireTOTP,
  emailShareEnabled,
  onUnlockTOTP,
  isShareUnlocked,
  totpToken,
  onEmailShare,
}: ShareTabProps) {
  const [files, setFiles] = useState<File[]>([])
  const [textItems, setTextItems] = useState<TextItem[]>([])
  const [validityDays, setValidityDays] = useState<ValidityDays>(7)
  const [encryptionKey, setEncryptionKey] = useState(() =>
    generateEncryptionKey(),
  )

  const {
    results: shareResults,
    addResult,
    removeResult,
    clearResults,
  } = useShareStore()

  const {
    uploadWithSession,
    cancelUpload,
    isUploading,
    uploadProgress,
    uploadStatus,
    fileProgress,
    error,
  } = usePocketChest()

  const api = new PocketChestAPI()

  const doUpload = async (filesToUpload: File[], textsToUpload: TextItem[]) => {
    const session = await api.createChest(totpToken ?? undefined)

    const result = await uploadWithSession(
      session.sessionId,
      session.uploadToken,
      filesToUpload,
      textsToUpload,
      validityDays,
      encryptionKey,
    )

    const shareUrl = `${window.location.origin}/?code=${result.retrievalCode}#key=${encodeURIComponent(result.encryptionKey)}`

    addResult({
      id: String(genid.nextId()),
      retrievalCode: result.retrievalCode,
      encryptionKey: result.encryptionKey,
      shareUrl,
      timestamp: Date.now(),
    })

    setFiles([])
    setTextItems([])
    setEncryptionKey(generateEncryptionKey())
  }

  const handleUpload = async () => {
    if (files.length === 0 && textItems.length === 0) return
    try {
      await doUpload(files, textItems)
    } catch (err) {
      console.error('Upload failed:', err)
    }
  }

  const handleRetry = async () => {
    try {
      await doUpload(files, textItems)
    } catch (err) {
      console.error('Retry failed:', err)
    }
  }

  if (requireTOTP && !isShareUnlocked) {
    return (
      <Card className="shadow-none max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-2">
            <ShieldCheck size={32} className="text-muted-foreground" />
          </div>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            Enter your TOTP code to unlock the Share feature
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            onClick={onUnlockTOTP}
            className="bg-gradient-to-r from-purple-500 to-blue-500 border-none text-white"
          >
            Unlock with TOTP
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 h-full">
      <div className="space-y-4">
        <ShareForm
          files={files}
          textItems={textItems}
          validityDays={validityDays}
          encryptionKey={encryptionKey}
          isUploading={isUploading}
          onFilesChange={setFiles}
          onTextItemsChange={setTextItems}
          onValidityDaysChange={setValidityDays}
          onEncryptionKeyChange={setEncryptionKey}
          onUpload={handleUpload}
        />
      </div>
      <ShareResults
        results={shareResults}
        emailShareEnabled={emailShareEnabled}
        uploadStatus={uploadStatus}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        fileProgress={fileProgress}
        files={files}
        textItems={textItems}
        error={error || undefined}
        onRemove={removeResult}
        onClearAll={clearResults}
        onEmailShare={onEmailShare}
        onRetry={handleRetry}
        onCancel={cancelUpload}
      />
    </div>
  )
}
