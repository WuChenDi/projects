import { describe, expect, it } from 'vitest'
import { CONFIG, MAGIC_BYTES } from '../src/constants'

describe('constants', () => {
  describe('CONFIG', () => {
    it('should define chunk sizes', () => {
      expect(CONFIG.CHUNK.SIZE).toBe(10 * 1024 * 1024)
      expect(CONFIG.CHUNK.BUFFER).toBe(20 * 1024 * 1024)
      expect(CONFIG.CHUNK.MAX_MEMORY).toBe(100 * 1024 * 1024)
    })

    it('should define argon2 parameters', () => {
      expect(CONFIG.ARGON2.t).toBe(3)
      expect(CONFIG.ARGON2.m).toBe(1280)
      expect(CONFIG.ARGON2.p).toBe(4)
    })

    it('should define size constants', () => {
      expect(CONFIG.SIZES.SALT).toBe(16)
      expect(CONFIG.SIZES.NONCE).toBe(12)
      expect(CONFIG.SIZES.SYM_KEY).toBe(32)
      expect(CONFIG.SIZES.SIGNATURE).toBe(64)
      expect(CONFIG.SIZES.HEADER_MAX).toBe(2048)
    })
  })

  describe('MAGIC_BYTES', () => {
    it('should define magic bytes for each mode', () => {
      expect(MAGIC_BYTES.PASSWORD).toBe('ns1')
      expect(MAGIC_BYTES.PUBLIC_KEY).toBe('ns0')
      expect(MAGIC_BYTES.SIGNED).toBe('ns2')
    })

    it('should have unique values', () => {
      const values = Object.values(MAGIC_BYTES)
      expect(new Set(values).size).toBe(values.length)
    })

    it('should all be 3 characters long', () => {
      for (const value of Object.values(MAGIC_BYTES)) {
        expect(value.length).toBe(3)
      }
    })
  })
})
