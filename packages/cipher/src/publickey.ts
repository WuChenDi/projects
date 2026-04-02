import { bytesToUtf8, randomBytes } from '@noble/ciphers/utils.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import * as ecies from 'eciesjs'
import { CONFIG, MAGIC_BYTES } from './constants'
import { EncryptionError, ERROR_MESSAGES, InvalidDataError } from './errors'
import { createStreamHeader, parseStreamHeader } from './header'
import { StreamCipher } from './stream-cipher'
import type { StreamDecryptOptions, StreamEncryptOptions } from './types'
import {
  hashFile,
  readAndExtractChunk,
  readFileChunk,
  secureClear,
} from './utils'

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
