import { describe, expect, it } from 'vitest'
import './polyfill'
import { sha256 } from '@noble/hashes/sha2.js'
import {
  deserializeMetadata,
  hashFile,
  readFileChunk,
  secureClear,
  serializeMetadata,
} from '../src/utils'

describe('utils', () => {
  describe('secureClear', () => {
    it('should zero out the buffer', () => {
      const buffer = new ArrayBuffer(32)
      const view = new Uint8Array(buffer)
      view.fill(0xff)

      secureClear(buffer)

      for (const byte of view) {
        expect(byte).toBe(0)
      }
    })
  })

  describe('serializeMetadata / deserializeMetadata', () => {
    it('should roundtrip correctly', () => {
      const hash = new Uint8Array(32)
      hash.fill(0xab)

      const metadata = { size: 12345, hash }
      const serialized = serializeMetadata(metadata)

      expect(serialized.length).toBe(36) // 4 bytes size + 32 bytes hash

      const deserialized = deserializeMetadata(serialized)
      expect(deserialized.size).toBe(12345)
      expect(deserialized.hash).toEqual(hash)
    })

    it('should handle zero size', () => {
      const hash = new Uint8Array(sha256(new Uint8Array(0)))
      const metadata = { size: 0, hash }
      const serialized = serializeMetadata(metadata)
      const deserialized = deserializeMetadata(serialized)

      expect(deserialized.size).toBe(0)
      expect(deserialized.hash).toEqual(hash)
    })

    it('should handle large sizes', () => {
      const hash = new Uint8Array(32).fill(0x01)
      const metadata = { size: 4294967295, hash } // uint32 max
      const serialized = serializeMetadata(metadata)
      const deserialized = deserializeMetadata(serialized)

      expect(deserialized.size).toBe(4294967295)
    })
  })

  describe('readFileChunk', () => {
    it('should read the specified range from a file', async () => {
      const content = 'Hello, World!'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const buffer = await readFileChunk(file, 0, 5)
      const text = new TextDecoder().decode(buffer)

      expect(text).toBe('Hello')
    })

    it('should read a middle range', async () => {
      const content = 'Hello, World!'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const buffer = await readFileChunk(file, 7, 12)
      const text = new TextDecoder().decode(buffer)

      expect(text).toBe('World')
    })

    it('should handle reading full file', async () => {
      const content = 'test content'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const buffer = await readFileChunk(file, 0, file.size)
      const text = new TextDecoder().decode(buffer)

      expect(text).toBe(content)
    })
  })

  describe('hashFile', () => {
    it('should produce a consistent sha256 hash', async () => {
      const content = 'deterministic content for hashing'
      const file = new File([content], 'test.txt', { type: 'text/plain' })

      const hash1 = await hashFile(file)
      const hash2 = await hashFile(file)

      expect(hash1).toEqual(hash2)
      expect(hash1.length).toBe(32) // sha256 = 32 bytes
    })

    it('should produce different hashes for different content', async () => {
      const file1 = new File(['content A'], 'a.txt')
      const file2 = new File(['content B'], 'b.txt')

      const hash1 = await hashFile(file1)
      const hash2 = await hashFile(file2)

      expect(hash1).not.toEqual(hash2)
    })

    it('should match direct sha256 for small files', async () => {
      const content = 'small test'
      const file = new File([content], 'test.txt')

      const fileHash = await hashFile(file)
      const directHash = sha256(new TextEncoder().encode(content))

      expect(fileHash).toEqual(new Uint8Array(directHash))
    })
  })
})
