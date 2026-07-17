import { PocketChestAPI } from '@/lib'

/** Thrown when the blob exceeds the server's max file size. */
export class ShareTooLargeError extends Error {
  constructor(public maxFileSize: number) {
    super('File exceeds the maximum share size')
    this.name = 'ShareTooLargeError'
  }
}

/**
 * Model A share: upload an already-encrypted blob as-is (no re-encryption, no
 * key in the URL) and return a retrieval code + link. The recipient fetches the
 * ciphertext and decrypts it with the password or their own private key.
 * Uploads carry a neutral name/MIME (`share.enc` + `application/octet-stream`);
 * the original filename lives inside the encrypted header and reappears when
 * the recipient decrypts locally.
 */
export async function shareEncryptedBlob(
  blob: Blob,
  maxFileSize: number,
  password?: string,
): Promise<{ code: string; url: string }> {
  const api = new PocketChestAPI()
  if (blob.size > maxFileSize) {
    throw new ShareTooLargeError(maxFileSize)
  }
  const { sessionId, uploadToken } = await api.createChest(password)
  const file = new File([blob], 'share.enc', {
    type: 'application/octet-stream',
  })
  const { uploadedFiles } = await api.uploadContent(sessionId, uploadToken, [
    file,
  ])
  const fileIds = uploadedFiles.map((f) => f.fileId)
  const { retrievalCode } = await api.completeUpload(
    sessionId,
    uploadToken,
    fileIds,
  )
  const url = `${window.location.origin}${window.location.pathname}?code=${retrievalCode}`
  return { code: retrievalCode, url }
}
