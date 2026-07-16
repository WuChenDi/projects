import { PocketChestAPI } from '@/lib'

/**
 * Model A share: upload an already-encrypted blob as-is (no re-encryption, no
 * key in the URL) and return a retrieval code + link. The recipient fetches the
 * ciphertext and decrypts it with the password or their own private key.
 */
export async function shareEncryptedBlob(
  blob: Blob,
  filename: string,
): Promise<{ code: string; url: string }> {
  const api = new PocketChestAPI()
  const { sessionId, uploadToken } = await api.createChest()
  const file = new File([blob], filename, { type: 'application/octet-stream' })
  const { uploadedFiles } = await api.uploadContent(
    sessionId,
    uploadToken,
    [file],
    [],
  )
  const fileIds = uploadedFiles.map((f) => f.fileId)
  const { retrievalCode } = await api.completeUpload(
    sessionId,
    uploadToken,
    fileIds,
  )
  const url = `${window.location.origin}${window.location.pathname}?code=${retrievalCode}`
  return { code: retrievalCode, url }
}
