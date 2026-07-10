import { useCallback, useState } from 'react'
import { PocketChestAPI } from '@/lib'
import {
  decryptFile,
  decryptTextContent,
  generateEncryptionKey,
} from '@/lib/crypto'
import type { FileUploadProgress, TextItem, ValidityDays } from '@/types'

export function usePocketChest() {
  const [isUploading, setIsUploading] = useState(false)
  const [isRetrieving, setIsRetrieving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState({
    percentage: 0,
    loaded: 0,
    total: 0,
  })
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')
  const [fileProgress, setFileProgress] = useState<FileUploadProgress[]>([])
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  const api = new PocketChestAPI()

  const upload = useCallback(
    async (
      files: File[],
      textItems: TextItem[],
      validityDays: ValidityDays = 7,
      totpToken?: string,
    ) => {
      setIsUploading(true)
      setError(null)

      try {
        const { sessionId, uploadToken } = await api.createChest(totpToken)

        const { uploadedFiles } = await api.uploadContent(
          sessionId,
          uploadToken,
          files,
          textItems,
        )

        const fileIds = uploadedFiles.map((f) => f.fileId)
        const result = await api.completeUpload(
          sessionId,
          uploadToken,
          fileIds,
          validityDays,
        )

        return {
          ...result,
          uploadedFiles,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setError(message)
        throw new Error(message)
      } finally {
        setIsUploading(false)
      }
    },
    [api],
  )

  const retrieve = useCallback(
    async (retrievalCode: string, encryptionKey: string) => {
      setIsRetrieving(true)
      setError(null)

      try {
        const { files, chestToken, expiryDate } =
          await api.retrieveChest(retrievalCode)

        const filesWithText = await Promise.all(
          files.map(async (file) => {
            if (file.isText) {
              const rawContent = await api.downloadTextContent(
                file.fileId,
                chestToken,
              )
              const content = await decryptTextContent(
                rawContent,
                encryptionKey,
              )
              return { ...file, content }
            } else {
              return { ...file }
            }
          }),
        )

        return {
          files: filesWithText,
          expiryDate,
          chestToken,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Retrieval failed'
        setError(message)
        throw new Error(message)
      } finally {
        setIsRetrieving(false)
      }
    },
    [api],
  )

  const downloadSingleFile = useCallback(
    async (
      fileId: string,
      chestToken: string,
      filename: string,
      encryptionKey: string,
    ) => {
      try {
        const blob = await api.downloadFile(fileId, chestToken)
        const decryptedBlob = await decryptFile(blob, encryptionKey, filename)
        api.triggerDownload(decryptedBlob, filename)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Download failed'
        setError(message)
        throw new Error(message)
      }
    },
    [api],
  )

  const uploadWithSession = useCallback(
    async (
      sessionId: string,
      uploadToken: string,
      files: File[],
      textItems: TextItem[],
      validityDays: ValidityDays = 7,
      encryptionKey?: string,
    ) => {
      const controller = new AbortController()
      setAbortController(controller)

      setIsUploading(true)
      setUploadStatus('uploading')
      setError(null)
      setUploadProgress({ percentage: 0, loaded: 0, total: 0 })
      setFileProgress([])

      const finalKey = encryptionKey || generateEncryptionKey()

      try {
        let finalProgress = { percentage: 0, loaded: 0, total: 0 }

        const { uploadedFiles } = await api.uploadContent(
          sessionId,
          uploadToken,
          files,
          textItems,
          (progress) => {
            finalProgress = progress
            setUploadProgress(progress)
          },
          (fileProgressList) => {
            setFileProgress(fileProgressList)
          },
          finalKey,
        )

        setUploadProgress({
          percentage: 100,
          loaded: finalProgress.total,
          total: finalProgress.total,
        })

        const fileIds = uploadedFiles.map((f) => f.fileId)
        const result = await api.completeUpload(
          sessionId,
          uploadToken,
          fileIds,
          validityDays,
        )

        setUploadStatus('success')
        setAbortController(null)

        return {
          ...result,
          uploadedFiles,
          encryptionKey: finalKey,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setError(message)
        setUploadStatus('error')
        setAbortController(null)
        throw new Error(message)
      } finally {
        setIsUploading(false)
      }
    },
    [api],
  )

  const retryUpload = useCallback(
    async (
      sessionId: string,
      uploadToken: string,
      files: File[],
      textItems: TextItem[],
      validityDays: ValidityDays = 7,
      encryptionKey?: string,
    ) => {
      if (abortController) {
        abortController.abort()
        setAbortController(null)
      }

      setUploadStatus('idle')
      setError(null)
      setUploadProgress({ percentage: 0, loaded: 0, total: 0 })
      setFileProgress([])

      return uploadWithSession(
        sessionId,
        uploadToken,
        files,
        textItems,
        validityDays,
        encryptionKey,
      )
    },
    [uploadWithSession, abortController],
  )

  const cancelUpload = useCallback(() => {
    // Abort any ongoing requests
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }

    // Reset all state
    setIsUploading(false)
    setUploadStatus('idle')
    setUploadProgress({ percentage: 0, loaded: 0, total: 0 })
    setFileProgress([])
    setError(null)
  }, [abortController])

  return {
    upload,
    uploadWithSession,
    retryUpload,
    cancelUpload,
    retrieve,
    downloadSingleFile,
    isUploading,
    isRetrieving,
    error,
    uploadProgress,
    uploadStatus,
    fileProgress,
    clearError: () => setError(null),
  }
}
