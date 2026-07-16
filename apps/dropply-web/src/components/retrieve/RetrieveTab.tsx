'use client'

import { logger } from '@cdlab/utils'
import { useState } from 'react'
import { RetrieveForm } from '@/components/retrieve/RetrieveForm'
import { RetrieveResults } from '@/components/retrieve/RetrieveResults'
import { usePocketChest } from '@/hooks/usePocketChest'
import { genid } from '@/lib'
import { useRetrieveStore } from '@/store/useRetrieveStore'

interface RetrieveTabProps {
  initialCode?: string
  initialEncryptionKey?: string | null
}

export function RetrieveTab({
  initialCode,
  initialEncryptionKey,
}: RetrieveTabProps) {
  const [retrievalCode, setRetrievalCode] = useState(initialCode || '')
  const [encryptionKey, setEncryptionKey] = useState<string | null>(
    initialEncryptionKey ?? null,
  )

  const {
    results: retrieveResults,
    addResult,
    removeResult,
    clearResults,
    hasCode,
  } = useRetrieveStore()

  const { retrieve, downloadSingleFile, isRetrieving, error, clearError } =
    usePocketChest()

  const handleRetrieve = async () => {
    const code = retrievalCode.trim()
    if (!code || code.length !== 6 || !encryptionKey) return
    if (hasCode(code)) return

    try {
      const result = await retrieve(code, encryptionKey)
      addResult({
        id: String(genid.nextId()),
        retrievalCode: code,
        encryptionKey,
        files: result.files,
        chestToken: result.chestToken,
        expiryDate: result.expiryDate || '',
        timestamp: Date.now(),
      })
      setRetrievalCode('')
      setEncryptionKey(null)
    } catch (err) {
      logger.error('Retrieval failed:', err)
    }
  }

  const handleDownload = async (
    fileId: string,
    chestToken: string,
    filename: string,
    fileEncryptionKey: string,
  ) => {
    try {
      await downloadSingleFile(fileId, chestToken, filename, fileEncryptionKey)
    } catch (err) {
      logger.error('Download failed:', err)
    }
  }

  return (
    <div className="w-full space-y-5">
      <RetrieveForm
        retrievalCode={retrievalCode}
        encryptionKey={encryptionKey}
        isRetrieving={isRetrieving}
        alreadyRetrieved={hasCode(retrievalCode.trim())}
        onRetrievalCodeChange={setRetrievalCode}
        onEncryptionKeyChange={setEncryptionKey}
        onRetrieve={handleRetrieve}
      />
      <RetrieveResults
        results={retrieveResults}
        isRetrieving={isRetrieving}
        error={error}
        onClearError={clearError}
        onDownload={handleDownload}
        onRemove={removeResult}
        onClearAll={clearResults}
      />
    </div>
  )
}
