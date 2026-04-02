import { bytesToUtf8, randomBytes } from '@noble/ciphers/utils.js'
import { argon2id } from '@noble/hashes/argon2.js'
import { CONFIG, MAGIC_BYTES } from './constants'
import { EncryptionError, ERROR_MESSAGES, InvalidDataError } from './errors'
import { createStreamHeader, parseStreamHeader } from './header'
import { StreamCipher } from './stream-cipher'
import type { StreamDecryptOptions, StreamEncryptOptions } from './types'
import { readAndExtractChunk, readFileChunk, secureClear } from './utils'

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
