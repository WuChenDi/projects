import { xchacha20poly1305 as gcm } from '@noble/ciphers/chacha.js'
import { concatBytes, managedNonce } from '@noble/ciphers/utils.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { DecryptionError, EncryptionError, ERROR_MESSAGES } from './errors'
import type { ChunkMetadata } from './types'
import { secureClear, serializeMetadata, waitForMemory } from './utils'

export class StreamCipher {
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
