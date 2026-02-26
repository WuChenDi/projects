/*
 * Copyright (c) Project nsiod. (MIT License)
 * https://github.com/nsiod/share
 */

import { xchacha20poly1305 as gcm } from '@noble/ciphers/chacha.js'
import {
  bytesToUtf8,
  concatBytes,
  managedNonce,
  randomBytes,
  utf8ToBytes,
} from '@noble/ciphers/utils.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { argon2id } from '@noble/hashes/argon2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { base64 } from '@scure/base'
import * as ecies from 'eciesjs'

// Types and interfaces
interface HeaderData {
  e: string // extension
  c: number // chunk count
  s?: Uint8Array // signature
}

interface StreamHeader {
  ext: string
  totalChunks: number
  pwd?: {
    key: Uint8Array
    salt: Uint8Array
  }
  key?: {
    receiver: Uint8Array
    key: Uint8Array
    encryptedKey: Uint8Array
    signature?: Uint8Array
  }
}

interface ChunkMetadata {
  size: number
  hash: Uint8Array
}

type ProgressCallback = (progress: number) => void
type StageCallback = (stage: string) => void

// Crypto configuration
const CONFIG = {
  CHUNK: {
    SIZE: 10 * 1024 * 1024, // 10MB chunks for processing
    BUFFER: 20 * 1024 * 1024, // 20MB buffer for streaming
    MAX_MEMORY: 100 * 1024 * 1024, // 100MB max memory per operation
  },
  ARGON2: {
    t: 3, // Time cost
    m: 1280, // Memory cost (in KiB)
    p: 4, // Parallelism
    maxmem: 2 ** 32 - 1, // Maximum memory (4GB)
  },
  SIZES: {
    SALT: 16, // Salt length in bytes
    NONCE: 12, // Nonce length for GCM
    SYM_KEY: 32, // Symmetric key length
    SIGNATURE: 64, // Signature length
    HEADER_MAX: 2048, // Maximum header size to read
  },
} as const

// Magic bytes for different encryption modes
const MAGIC_BYTES = {
  PASSWORD: 'ns1',
  PUBLIC_KEY: 'ns0',
  SIGNED: 'ns2',
} as const

type MagicBytesType = (typeof MAGIC_BYTES)[keyof typeof MAGIC_BYTES]

// Error messages
const ERROR_MESSAGES = {
  PASSWORD_REQUIRED: 'Password is required',
  INVALID_FORMAT: 'Invalid format',
  RECEIVER_REQUIRED: 'Receiver public key is required',
  PRIVATE_KEY_REQUIRED: 'Receiver private key is required',
  MISSING_DECRYPT_PARAMS: 'Missing decryption parameters',
  PASSWORD_MODE_REQUIRED: 'Password required for ns1 format',
  PUBKEY_MODE_REQUIRED: 'Private key required for ns0/ns2 format',
  NOT_PASSWORD_ENCRYPTED: 'File is not password encrypted',
  NOT_PUBKEY_ENCRYPTED: 'File is not public key encrypted',
  CHUNK_READ_FAILED: 'Failed to read file chunk',
  CHUNK_INTEGRITY_FAILED: 'Chunk integrity check failed',
  SIGNATURE_VERIFY_FAILED: 'Signature verification failed',
  INVALID_ENCRYPTION_MODE:
    'Invalid encryption mode: must provide either password or receiver',
} as const

// Streaming encryption/decryption interfaces
export interface StreamBaseOptions {
  file: File
  password?: string
  receiver?: Uint8Array
  onProgress?: ProgressCallback
  onStage?: StageCallback
}

export interface StreamEncryptOptions extends StreamBaseOptions {
  sender?: { privKeyBytes: Uint8Array }
}

export interface StreamDecryptOptions extends StreamBaseOptions {
  sender?: Uint8Array
}

// Error types
class CryptoError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'CryptoError'
  }
}

class InvalidDataError extends CryptoError {
  constructor(message: string) {
    super(message, 'INVALID_DATA')
  }
}

class DecryptionError extends CryptoError {
  constructor(message: string) {
    super(message, 'DECRYPTION_FAILED')
  }
}

class EncryptionError extends CryptoError {
  constructor(message: string) {
    super(message, 'ENCRYPTION_FAILED')
  }
}

// Helper functions
function secureClear(buffer: ArrayBufferLike): void {
  const view = new Uint8Array(buffer)
  crypto.getRandomValues(view)
  view.fill(0)
}

// Memory monitoring
function getMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize
  }
  return 0
}

function waitForMemory(
  threshold: number = CONFIG.CHUNK.MAX_MEMORY,
): Promise<void> {
  return new Promise((resolve) => {
    const checkMemory = () => {
      if (getMemoryUsage() < threshold) {
        resolve()
      } else {
        if ('gc' in window) {
          ;(window as any).gc()
        }
        setTimeout(checkMemory, 100)
      }
    }
    checkMemory()
  })
}

function serializeMetadata(metadata: ChunkMetadata): Uint8Array {
  const sizeBytes = new Uint8Array(4)
  new DataView(sizeBytes.buffer).setUint32(0, metadata.size, true)

  return concatBytes(sizeBytes, metadata.hash)
}

function deserializeMetadata(bytes: Uint8Array): ChunkMetadata {
  const view = new DataView(bytes.buffer, bytes.byteOffset)
  return {
    size: view.getUint32(0, true),
    hash: bytes.slice(4, 36),
  }
}

// Stream cipher for large files
class StreamCipher {
  private key: Uint8Array

  constructor(key: Uint8Array) {
    this.key = key
  }

  async encryptChunk(chunk: Uint8Array): Promise<Uint8Array> {
    try {
      await waitForMemory()
      const hash = new Uint8Array(sha256(chunk))
      const cipher = managedNonce(gcm)(this.key)

      const encryptedChunk = cipher.encrypt(chunk)
      const metadata: ChunkMetadata = {
        size: encryptedChunk.length,
        hash,
      }
      const metadataBytes = serializeMetadata(metadata)
      return concatBytes(metadataBytes, encryptedChunk)
    } catch (error) {
      throw new EncryptionError(
        `Failed to encrypt chunk: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async decryptChunk(encryptedData: Uint8Array, metadata: ChunkMetadata) {
    try {
      await waitForMemory()

      if (encryptedData.length === 0) {
        throw new DecryptionError('Encrypted data is empty')
      }

      const cipher = managedNonce(gcm)(this.key)
      const chunk = cipher.decrypt(encryptedData)

      const hash = new Uint8Array(sha256(chunk))
      if (!this.compareArrays(hash, metadata.hash)) {
        throw new DecryptionError(ERROR_MESSAGES.CHUNK_INTEGRITY_FAILED)
      }
      return { chunk, metadata }
    } catch (error) {
      throw new DecryptionError(
        `Failed to decrypt chunk: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  private compareArrays(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= (a[i] ?? 0) ^ (b[i] ?? 0)
    }
    return result === 0
  }

  destroy() {
    secureClear(this.key.buffer)
  }
}

// Helper functions
async function readFileChunk(
  file: File,
  start: number,
  end: number,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const blob = file.slice(start, end)
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error(ERROR_MESSAGES.CHUNK_READ_FAILED))
    reader.readAsArrayBuffer(blob)
  })
}

async function readAndExtractChunk(file: File, offset: number) {
  try {
    // First read the metadata part (36 bytes)
    const metadataBuffer = await readFileChunk(file, offset, offset + 36)
    const metadataBytes = new Uint8Array(metadataBuffer)
    const metadata = deserializeMetadata(metadataBytes)

    // Now we know the actual data size, read the complete chunk
    const totalChunkSize = 36 + metadata.size // metadata + encrypted data
    const fullBuffer = await readFileChunk(
      file,
      offset,
      offset + totalChunkSize,
    )
    const fullData = new Uint8Array(fullBuffer)

    return {
      data: fullData.slice(36), // Only return the encrypted data part
      totalSize: totalChunkSize, // Total size of this chunk
      metadata,
    }
  } catch (error) {
    throw new InvalidDataError(
      `Failed to read chunk: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

// Stream hash calculation
async function hashFile(file: File): Promise<Uint8Array> {
  const chunkSize = 1024 * 1024 * 10
  const hasher = sha256.create()

  try {
    for (let i = 0; i < file.size; i += chunkSize) {
      const chunk = await readFileChunk(
        file,
        i,
        Math.min(i + chunkSize, file.size),
      )
      hasher.update(new Uint8Array(chunk))
      await waitForMemory()
    }

    return hasher.digest()
  } catch (error) {
    throw new InvalidDataError(
      `Failed to hash file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

// Create streaming header
function createStreamHeader(streamHeader: StreamHeader) {
  const header: HeaderData = {
    e: streamHeader.ext,
    c: streamHeader.totalChunks,
  }

  try {
    if (streamHeader.pwd) {
      const aes = managedNonce(gcm)(streamHeader.pwd.key)
      const headerJson = JSON.stringify(header)
      const headerBytes = utf8ToBytes(headerJson)
      const encodeHeader = aes.encrypt(headerBytes)

      // Total length = salt(16) + encrypted header
      const totalLength = CONFIG.SIZES.SALT + encodeHeader.length
      const headerLength = new Uint8Array(2)
      new DataView(headerLength.buffer).setUint16(0, totalLength, true)

      return concatBytes(
        utf8ToBytes(MAGIC_BYTES.PASSWORD),
        headerLength,
        streamHeader.pwd.salt,
        encodeHeader,
      )
    }

    if (streamHeader.key) {
      const magicBytes = streamHeader.key.signature
        ? MAGIC_BYTES.SIGNED
        : MAGIC_BYTES.PUBLIC_KEY
      header.s = streamHeader.key.signature
      const headerJson = JSON.stringify(header)
      const headerBytes = utf8ToBytes(headerJson)
      const aes = managedNonce(gcm)(streamHeader.key.key)

      const encodeHeader = aes.encrypt(headerBytes)
      const keyLength = streamHeader.key.encryptedKey.length

      // Total length = key length field(2) + encrypted key + encrypted header
      const totalLength = 2 + keyLength + encodeHeader.length
      const headerLength = new Uint8Array(2)
      new DataView(headerLength.buffer).setUint16(0, totalLength, true)

      const keyLengthBytes = new Uint8Array(2)
      new DataView(keyLengthBytes.buffer).setUint16(0, keyLength, true)

      return concatBytes(
        utf8ToBytes(magicBytes),
        headerLength,
        keyLengthBytes,
        streamHeader.key.encryptedKey,
        encodeHeader,
      )
    }
  } catch (error) {
    throw new EncryptionError(
      `Failed to create header: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

// Parse streaming header
export function parseStreamHeader(
  data: Uint8Array,
  password?: string,
  receiver?: Uint8Array,
) {
  try {
    const magicBytes = bytesToUtf8(data.slice(0, 3))
    if (!Object.values(MAGIC_BYTES).includes(magicBytes as MagicBytesType)) {
      throw new Error(ERROR_MESSAGES.INVALID_FORMAT)
    }

    const headerLengthBytes = data.slice(3, 5)
    const totalHeaderLength = new DataView(
      headerLengthBytes.buffer,
      headerLengthBytes.byteOffset,
    ).getUint16(0, true)
    const isPasswordMode = magicBytes === MAGIC_BYTES.PASSWORD
    const headerOffset = 5

    if (isPasswordMode) {
      const salt = data.slice(headerOffset, headerOffset + CONFIG.SIZES.SALT)
      const encryptedHeaderBytes = data.slice(
        headerOffset + CONFIG.SIZES.SALT,
        totalHeaderLength + headerOffset,
      )

      if (!password) {
        throw new InvalidDataError(ERROR_MESSAGES.PASSWORD_REQUIRED)
      }
      const key = argon2id(password, salt, CONFIG.ARGON2)
      const aes = managedNonce(gcm)(key)

      const headerBytes = aes.decrypt(encryptedHeaderBytes)
      const headerJson = bytesToUtf8(headerBytes)
      const header = JSON.parse(headerJson) as HeaderData

      return { header, headerLength: totalHeaderLength + headerOffset, key }
    } else if (receiver) {
      // Read key length (2 bytes)
      const keyLengthBytes = data.slice(headerOffset, headerOffset + 2)
      const keyLength = new DataView(
        keyLengthBytes.buffer,
        keyLengthBytes.byteOffset,
      ).getUint16(0, true)

      // Extract encrypted symmetric key
      const encryptedKey = data.slice(
        headerOffset + 2,
        headerOffset + 2 + keyLength,
      )

      // Calculate position and size of encrypted header data
      const encryptedHeaderStart = headerOffset + 2 + keyLength
      const encryptedHeaderEnd = headerOffset + totalHeaderLength
      const encryptedHeaderBytes = data.slice(
        encryptedHeaderStart,
        encryptedHeaderEnd,
      )

      const symmetricKey = ecies.decrypt(receiver, encryptedKey)
      if (!symmetricKey) {
        throw new InvalidDataError(ERROR_MESSAGES.MISSING_DECRYPT_PARAMS)
      }
      const aes = managedNonce(gcm)(symmetricKey)
      const headerBytes = aes.decrypt(encryptedHeaderBytes)
      const headerJson = bytesToUtf8(headerBytes)
      const header = JSON.parse(headerJson) as HeaderData

      return {
        header,
        headerLength: headerOffset + totalHeaderLength, // Complete header length
        signature: header.s,
        key: symmetricKey,
      }
    }
  } catch (error) {
    throw new DecryptionError(
      `Failed to parse header: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

// Detect encryption type and file metadata
export async function detect(fileOrBase64: File | string) {
  try {
    const ENCRYPTION_TYPE_MAP: Record<string, 'pwd' | 'pubk' | 'signed'> = {
      [MAGIC_BYTES.PASSWORD]: 'pwd',
      [MAGIC_BYTES.PUBLIC_KEY]: 'pubk',
      [MAGIC_BYTES.SIGNED]: 'signed',
    }

    const isText = typeof fileOrBase64 === 'string'
    let magic: string

    if (isText) {
      magic = fileOrBase64?.slice(0, 3) || ''
    } else {
      const headerData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(fileOrBase64.slice(0, 3))
      })
      magic = bytesToUtf8(new Uint8Array(headerData))
    }

    const encryptionType = ENCRYPTION_TYPE_MAP[magic] || 'unencrypted'
    return { encryptionType, isText }
  } catch {
    return {
      encryptionType: 'unencrypted',
      isText: typeof fileOrBase64 === 'string',
    }
  }
}

// Stream encrypt with password
export async function streamEncryptWithPassword(options: StreamEncryptOptions) {
  const { file, password, onProgress, onStage } = options

  if (!password) {
    throw new InvalidDataError(ERROR_MESSAGES.PASSWORD_REQUIRED)
  }

  const chunks: Uint8Array[] = []
  const fileSize = file.size
  const totalChunks = Math.ceil(fileSize / CONFIG.CHUNK.SIZE)
  const ext = file.name.split('.').pop() || 'bin'

  onStage?.('Generating encryption key...')

  const salt = randomBytes(CONFIG.SIZES.SALT)
  const key = argon2id(password, salt, CONFIG.ARGON2)

  try {
    if (!key) {
      throw new InvalidDataError(ERROR_MESSAGES.MISSING_DECRYPT_PARAMS)
    }
    const cipher = new StreamCipher(key)
    const header = createStreamHeader({
      ext,
      totalChunks,
      pwd: {
        key,
        salt,
      },
    })

    if (!header) {
      throw new EncryptionError('Failed to create header')
    }
    chunks.push(header)

    onStage?.('Encrypting file...')

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CONFIG.CHUNK.SIZE
      const end = Math.min(start + CONFIG.CHUNK.SIZE, fileSize)

      const chunk = await readFileChunk(file, start, end)
      onProgress?.((i / totalChunks) * 100)
      await new Promise((resolve) => setTimeout(resolve, 0))

      const encryptedChunk = await cipher.encryptChunk(new Uint8Array(chunk))
      chunks.push(encryptedChunk)

      onProgress?.(((i + 1) / totalChunks) * 100)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    cipher.destroy()
    onStage?.('Creating encrypted file...')

    return new Blob(chunks as BlobPart[], { type: 'application/octet-stream' })
  } finally {
    if (key) {
      secureClear(key.buffer)
    }
  }
}

// Stream decrypt with password
export async function streamDecryptWithPassword(options: StreamDecryptOptions) {
  const { file, password, onProgress, onStage } = options

  if (!password) {
    throw new InvalidDataError(ERROR_MESSAGES.PASSWORD_REQUIRED)
  }

  onStage?.('Reading encrypted file header...')

  const headerData = await readFileChunk(file, 0, CONFIG.SIZES.HEADER_MAX)

  const magicBytes = bytesToUtf8(new Uint8Array(headerData).slice(0, 3))
  if (magicBytes !== MAGIC_BYTES.PASSWORD) {
    throw new InvalidDataError(ERROR_MESSAGES.NOT_PASSWORD_ENCRYPTED)
  }

  const parsedHeader = parseStreamHeader(
    new Uint8Array(headerData),
    password,
    undefined,
  )
  if (!parsedHeader) {
    throw new InvalidDataError(ERROR_MESSAGES.INVALID_FORMAT)
  }
  const { header, key, headerLength } = parsedHeader
  onStage?.('Deriving decryption key...')

  try {
    if (!key) {
      throw new InvalidDataError(ERROR_MESSAGES.MISSING_DECRYPT_PARAMS)
    }
    const cipher = new StreamCipher(key)
    const chunks: Uint8Array[] = []
    let offset = headerLength

    onStage?.('Decrypting file...')

    for (let i = 0; i < header.c; i++) {
      const chunkData = await readAndExtractChunk(file, offset)
      const { chunk } = await cipher.decryptChunk(
        chunkData.data,
        chunkData.metadata,
      )
      chunks.push(chunk)

      offset += chunkData.totalSize
      onProgress?.(((i + 1) / header.c) * 100)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    cipher.destroy()
    onStage?.('Creating decrypted file...')

    return { file: new Blob(chunks as BlobPart[]), signatureValid: undefined }
  } finally {
    if (key) {
      secureClear(key.buffer)
    }
  }
}

// Stream encrypt with ECIES (public key)
export async function streamEncryptWithPublicKey(
  options: StreamEncryptOptions,
) {
  const { file, receiver, sender, onProgress, onStage } = options

  if (!receiver) {
    throw new InvalidDataError(ERROR_MESSAGES.RECEIVER_REQUIRED)
  }

  onStage?.('Generating encryption key...')

  const symmetricKey = randomBytes(CONFIG.SIZES.SYM_KEY)
  const encryptedKey = ecies.encrypt(receiver, symmetricKey)
  try {
    const cipher = new StreamCipher(symmetricKey)
    const chunks: Uint8Array[] = []
    const fileSize = file.size
    const totalChunks = Math.ceil(fileSize / CONFIG.CHUNK.SIZE)
    const ext = file.name.split('.').pop() || 'bin'

    let signature: Uint8Array | undefined
    if (sender) {
      onStage?.('Creating digital signature...')
      const fileHash = await hashFile(file)
      // const sig = secp256k1.sign(fileHash, sender.privKeyBytes)
      // signature = sig.toCompactRawBytes()
      signature = secp256k1.sign(fileHash, sender.privKeyBytes)
    }

    const header = createStreamHeader({
      ext,
      totalChunks,
      key: {
        receiver: receiver,
        key: symmetricKey,
        encryptedKey: encryptedKey,
        signature: signature,
      },
    })

    if (!header) {
      throw new EncryptionError('Failed to create header')
    }

    chunks.push(header)

    onStage?.('Encrypting file...')

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CONFIG.CHUNK.SIZE
      const end = Math.min(start + CONFIG.CHUNK.SIZE, fileSize)

      const chunk = await readFileChunk(file, start, end)
      const encryptedChunk = await cipher.encryptChunk(new Uint8Array(chunk))
      chunks.push(encryptedChunk)

      onProgress?.(((i + 1) / totalChunks) * 100)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    cipher.destroy()
    onStage?.('Creating encrypted file...')

    return new Blob(chunks as BlobPart[], { type: 'application/octet-stream' })
  } finally {
    secureClear(symmetricKey.buffer)
  }
}

// Stream decrypt with ECIES (private key)
export async function streamDecryptWithPrivateKey(
  options: StreamDecryptOptions,
) {
  const { file, receiver, sender, onProgress, onStage } = options

  if (!receiver) {
    throw new InvalidDataError(ERROR_MESSAGES.PRIVATE_KEY_REQUIRED)
  }

  onStage?.('Reading encrypted file header...')

  const headerData = await readFileChunk(file, 0, CONFIG.SIZES.HEADER_MAX)
  const headerArray = new Uint8Array(headerData)

  const magicBytes = bytesToUtf8(headerArray.slice(0, 3))
  if (
    magicBytes !== MAGIC_BYTES.PUBLIC_KEY &&
    magicBytes !== MAGIC_BYTES.SIGNED
  ) {
    throw new InvalidDataError(ERROR_MESSAGES.NOT_PUBKEY_ENCRYPTED)
  }

  const parsedHeader = parseStreamHeader(headerArray, undefined, receiver)
  if (!parsedHeader) {
    throw new InvalidDataError(ERROR_MESSAGES.INVALID_FORMAT)
  }
  const { header, headerLength, signature, key } = parsedHeader

  try {
    if (!key) {
      throw new InvalidDataError(ERROR_MESSAGES.MISSING_DECRYPT_PARAMS)
    }
    const cipher = new StreamCipher(key)
    const chunks: Uint8Array[] = []
    let offset = headerLength
    let isValid: boolean | undefined

    if (signature && sender) {
      onStage?.('Verifying digital signature...')
      const fileHash = await hashFile(file)
      // const sig = secp256k1.Signature.fromCompact(signature)
      // isValid = secp256k1.verify(sig, fileHash, sender)
      isValid = secp256k1.verify(signature, fileHash, sender)

      if (!isValid) {
        onStage?.(ERROR_MESSAGES.SIGNATURE_VERIFY_FAILED)
      }
    }

    onStage?.('Decrypting file...')

    for (let i = 0; i < header.c; i++) {
      const chunkData = await readAndExtractChunk(file, offset)
      const { chunk } = await cipher.decryptChunk(
        chunkData.data,
        chunkData.metadata,
      )
      chunks.push(chunk)
      onStage?.('Creating decrypted file...' + i)
      offset += chunkData.totalSize
      onProgress?.(((i + 1) / header.c) * 100)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    cipher.destroy()
    onStage?.('Creating decrypted file...')

    return { file: new Blob(chunks as BlobPart[]), signatureValid: isValid }
  } finally {
    if (key) {
      secureClear(key.buffer)
    }
  }
}

// Text encryption/decryption functions
export async function encryptText(
  text: string,
  password?: string,
  receiver?: Uint8Array,
  sender?: { privKeyBytes: Uint8Array },
) {
  const file = new File([text], 'source.txt', { type: 'text/plain' })
  let blob: Blob
  let prefix: string
  if (password) {
    blob = await streamCrypto.encrypt.withPassword({
      file,
      password,
      receiver,
      sender,
    })
    prefix = MAGIC_BYTES.PASSWORD
  } else if (receiver) {
    blob = await streamCrypto.encrypt.withPublicKey({ file, receiver, sender })
    prefix = sender ? MAGIC_BYTES.SIGNED : MAGIC_BYTES.PUBLIC_KEY
  } else {
    throw new Error('Either password or receiver is required')
  }

  // Convert blob to base64 and add prefix
  const arrayBuffer = await blob.arrayBuffer()
  const base64String = base64.encode(new Uint8Array(arrayBuffer))
  return {
    blob,
    base64: `${prefix}${base64String}`,
  }
}

export async function decryptText(
  encryptedText: string,
  password?: string,
  receiver?: Uint8Array,
  sender?: Uint8Array,
) {
  // Remove potential prefix from base64 string
  const prefix = encryptedText.slice(0, 3)
  let base64Data = encryptedText
  if (
    prefix === MAGIC_BYTES.PASSWORD ||
    prefix === MAGIC_BYTES.PUBLIC_KEY ||
    prefix === MAGIC_BYTES.SIGNED
  ) {
    base64Data = encryptedText.slice(3)
  }

  const encryptedData = base64.decode(base64Data)
  const file = new File([encryptedData as BlobPart], 'encrypted.txt', {
    type: 'text/plain',
  })
  let result: { file: Blob; signatureValid?: boolean }
  if (password) {
    result = await streamCrypto.decrypt.withPassword({
      file,
      password,
      receiver,
      sender,
    })
  } else if (receiver) {
    result = await streamCrypto.decrypt.withPrivateKey({
      file,
      receiver,
      sender,
    })
  } else {
    throw new Error('Either password or receiver is required')
  }

  return {
    text: await result.file.text(),
    signatureValid: result.signatureValid,
  }
}

// Export main streaming functions
export const streamCrypto = {
  encrypt: {
    withPassword: streamEncryptWithPassword,
    withPublicKey: streamEncryptWithPublicKey,
  },
  decrypt: {
    withPassword: streamDecryptWithPassword,
    withPrivateKey: streamDecryptWithPrivateKey,
  },
}

// Export text functions
export const textCrypto = {
  encrypt: encryptText,
  decrypt: decryptText,
}
