import {
  streamDecryptWithPassword,
  streamEncryptWithPassword,
  textCrypto,
} from '@cdlab/cipher'

/**
 * Generate a random 256-bit encryption key, returned as base64url string.
 * This key is used as the "password" for Argon2id key derivation.
 */
export function generateEncryptionKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  // base64url encode (no padding)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** Encode key for safe inclusion in URL fragment */
export function encodeKeyForUrl(key: string): string {
  return encodeURIComponent(key)
}

/** Decode key from URL fragment. Returns null if missing. */
export function decodeKeyFromUrl(hash: string): string | null {
  if (!hash || !hash.includes('key=')) return null
  const match = hash.match(/key=([^&]+)/)
  if (!match?.[1]) return null
  return decodeURIComponent(match[1])
}

/** Encrypt a File, returns encrypted Blob */
export async function encryptFile(
  file: File,
  password: string,
  onProgress?: (percent: number) => void,
  onStage?: (stage: string) => void,
): Promise<Blob> {
  return streamEncryptWithPassword({ file, password, onProgress, onStage })
}

/** Decrypt an encrypted Blob back to a Blob */
export async function decryptFile(
  encryptedBlob: Blob,
  password: string,
  originalFilename: string,
  onProgress?: (percent: number) => void,
  onStage?: (stage: string) => void,
): Promise<Blob> {
  const file = new File([encryptedBlob], originalFilename, {
    type: 'application/octet-stream',
  })
  const result = await streamDecryptWithPassword({
    file,
    password,
    onProgress,
    onStage,
  })
  return result.file
}

/** Encrypt text content, returns encrypted base64 string */
export async function encryptTextContent(
  text: string,
  password: string,
): Promise<string> {
  const result = await textCrypto.encrypt(text, password)
  return result.base64
}

/** Decrypt encrypted text back to plaintext */
export async function decryptTextContent(
  encryptedText: string,
  password: string,
): Promise<string> {
  const result = await textCrypto.decrypt(encryptedText, password)
  return result.text
}

