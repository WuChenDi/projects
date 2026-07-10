'use client'

import { logger } from '@cdlab/utils'
import { useTranslations } from 'next-intl'
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
  maxFileSize: number
  onUnlockTOTP: () => void
  onAuthExpired: () => void
  isShareUnlocked: boolean
  totpToken: string | null
  onEmailShare: (code: string) => void
}

export function ShareTab({
  requireTOTP,
  emailShareEnabled,
  maxFileSize,
  onUnlockTOTP,
  onAuthExpired,
  isShareUnlocked,
  totpToken,
  onEmailShare,
}: ShareTabProps) {
  const t = useTranslations('share')
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

  const [isStarting, setIsStarting] = useState(false)
  const api = new PocketChestAPI()

  const doUpload = async (filesToUpload: File[], textsToUpload: TextItem[]) => {
    setIsStarting(true)
    try {
      let session: Awaited<ReturnType<typeof api.createChest>>
      try {
        session = await api.createChest(totpToken ?? undefined)
      } catch (err) {
        const status = (err as { status?: number }).status
        if (status === 401) {
          onAuthExpired()
          return
        }
        throw err
      }

      const result = await uploadWithSession(
        session.sessionId,
        session.uploadToken,
        filesToUpload,
        textsToUpload,
        validityDays,
        encryptionKey,
      )

      const shareUrl = `${window.location.origin}${window.location.pathname}?code=${result.retrievalCode}#key=${encodeURIComponent(result.encryptionKey)}`

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
    } finally {
      setIsStarting(false)
    }
  }

  const handleUpload = async () => {
    if (files.length === 0 && textItems.length === 0) return
    try {
      await doUpload(files, textItems)
    } catch (err) {
      logger.error('Upload failed:', err)
    }
  }

  const handleRetry = async () => {
    try {
      await doUpload(files, textItems)
    } catch (err) {
      logger.error('Retry failed:', err)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 h-full">
      <div className="space-y-4">
        <ShareForm
          locked={requireTOTP && !isShareUnlocked}
          maxFileSize={maxFileSize}
          onUnlock={onUnlockTOTP}
          files={files}
          textItems={textItems}
          validityDays={validityDays}
          encryptionKey={encryptionKey}
          isUploading={isUploading || isStarting}
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
