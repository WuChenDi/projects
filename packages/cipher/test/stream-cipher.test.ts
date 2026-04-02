import { describe, expect, it } from 'vitest'
import './polyfill'
import { randomBytes } from '@noble/ciphers/utils.js'
import { DecryptionError } from '../src/errors'
import { StreamCipher } from '../src/stream-cipher'
import { deserializeMetadata } from '../src/utils'

describe('StreamCipher', () => {
  function createCipher() {
    const key = randomBytes(32)
    return { cipher: new StreamCipher(key), key }
  }

  describe('encryptChunk / decryptChunk', () => {
    it('should roundtrip a small chunk', async () => {
      const { cipher } = createCipher()
      const plaintext = new TextEncoder().encode('Hello, cipher!')

      const encrypted = await cipher.encryptChunk(plaintext)

      // encrypted should be larger than plaintext (metadata + nonce + tag)
      expect(encrypted.length).toBeGreaterThan(plaintext.length)

      // Extract metadata and data
      const metadata = deserializeMetadata(encrypted.slice(0, 36))
      const encryptedData = encrypted.slice(36)

      expect(metadata.size).toBe(encryptedData.length)

      const { chunk } = await cipher.decryptChunk(encryptedData, metadata)
      expect(new TextDecoder().decode(chunk)).toBe('Hello, cipher!')

      cipher.destroy()
    })

    it('should roundtrip binary data', async () => {
      const { cipher } = createCipher()
      const plaintext = randomBytes(1024)

      const encrypted = await cipher.encryptChunk(plaintext)
      const metadata = deserializeMetadata(encrypted.slice(0, 36))
      const encryptedData = encrypted.slice(36)

      const { chunk } = await cipher.decryptChunk(encryptedData, metadata)
      expect(chunk).toEqual(plaintext)

      cipher.destroy()
    })

    it('should roundtrip an empty chunk', async () => {
      const { cipher } = createCipher()
      const plaintext = new Uint8Array(0)

      const encrypted = await cipher.encryptChunk(plaintext)
      const metadata = deserializeMetadata(encrypted.slice(0, 36))
      const encryptedData = encrypted.slice(36)

      const { chunk } = await cipher.decryptChunk(encryptedData, metadata)
      expect(chunk.length).toBe(0)

      cipher.destroy()
    })

    it('should fail decryption with wrong key', async () => {
      const { cipher: cipher1 } = createCipher()
      const { cipher: cipher2 } = createCipher()
      const plaintext = new TextEncoder().encode('secret data')

      const encrypted = await cipher1.encryptChunk(plaintext)
      const metadata = deserializeMetadata(encrypted.slice(0, 36))
      const encryptedData = encrypted.slice(36)

      await expect(
        cipher2.decryptChunk(encryptedData, metadata),
      ).rejects.toThrow(DecryptionError)

      cipher1.destroy()
      cipher2.destroy()
    })

    it('should fail decryption with empty data', async () => {
      const { cipher } = createCipher()
      const metadata = {
        size: 0,
        hash: new Uint8Array(32),
      }

      await expect(
        cipher.decryptChunk(new Uint8Array(0), metadata),
      ).rejects.toThrow(DecryptionError)

      cipher.destroy()
    })

    it('should fail with tampered data (integrity check)', async () => {
      const { cipher } = createCipher()
      const plaintext = new TextEncoder().encode('integrity test')

      const encrypted = await cipher.encryptChunk(plaintext)
      const metadata = deserializeMetadata(encrypted.slice(0, 36))
      const encryptedData = new Uint8Array(encrypted.slice(36))

      // Tamper with encrypted data
      if (encryptedData.length > 0) {
        encryptedData[0] ^= 0xff
      }

      await expect(
        cipher.decryptChunk(encryptedData, metadata),
      ).rejects.toThrow(DecryptionError)

      cipher.destroy()
    })
  })

  describe('destroy', () => {
    it('should zero out the key after destroy', () => {
      const key = randomBytes(32)
      const cipher = new StreamCipher(key)

      cipher.destroy()

      // Key buffer should be zeroed
      const allZero = key.every((byte) => byte === 0)
      expect(allZero).toBe(true)
    })
  })
})
