import { describe, expect, it } from 'vitest'
import './polyfill'
import { randomBytes } from '@noble/ciphers/utils.js'
import { argon2id } from '@noble/hashes/argon2.js'
import { CONFIG, MAGIC_BYTES } from '../src/constants'
import { DecryptionError } from '../src/errors'
import { createStreamHeader, parseStreamHeader } from '../src/header'

describe('header', () => {
  describe('password mode', () => {
    it('should create and parse a password header roundtrip', () => {
      const password = 'test-password-123'
      const salt = randomBytes(CONFIG.SIZES.SALT)
      const key = argon2id(password, salt, CONFIG.ARGON2)

      const header = createStreamHeader({
        ext: 'txt',
        totalChunks: 5,
        pwd: { key, salt },
      })

      expect(header).toBeDefined()
      expect(header!.length).toBeGreaterThan(0)

      // Verify magic bytes
      const magic = new TextDecoder().decode(header!.slice(0, 3))
      expect(magic).toBe(MAGIC_BYTES.PASSWORD)

      // Parse it back
      const parsed = parseStreamHeader(header!, password)
      expect(parsed).toBeDefined()
      expect(parsed!.header.e).toBe('txt')
      expect(parsed!.header.c).toBe(5)
      expect(parsed!.key).toBeDefined()
      expect(parsed!.headerLength).toBeGreaterThan(5)
    })

    it('should fail to parse without password', () => {
      const password = 'my-password'
      const salt = randomBytes(CONFIG.SIZES.SALT)
      const key = argon2id(password, salt, CONFIG.ARGON2)

      const header = createStreamHeader({
        ext: 'bin',
        totalChunks: 1,
        pwd: { key, salt },
      })

      expect(() => parseStreamHeader(header!)).toThrow(DecryptionError)
    })

    it('should fail to parse with wrong password', () => {
      const password = 'correct-password'
      const salt = randomBytes(CONFIG.SIZES.SALT)
      const key = argon2id(password, salt, CONFIG.ARGON2)

      const header = createStreamHeader({
        ext: 'pdf',
        totalChunks: 3,
        pwd: { key, salt },
      })

      expect(() => parseStreamHeader(header!, 'wrong-password')).toThrow(
        DecryptionError,
      )
    })

    it('should preserve extension and chunk count', () => {
      const password = 'p@ssw0rd!'
      const salt = randomBytes(CONFIG.SIZES.SALT)
      const key = argon2id(password, salt, CONFIG.ARGON2)

      const header = createStreamHeader({
        ext: 'mp4',
        totalChunks: 100,
        pwd: { key, salt },
      })

      const parsed = parseStreamHeader(header!, password)
      expect(parsed!.header.e).toBe('mp4')
      expect(parsed!.header.c).toBe(100)
    })
  })

  describe('invalid data', () => {
    it('should throw on invalid magic bytes', () => {
      const data = new TextEncoder().encode('xxx_invalid_data')
      expect(() => parseStreamHeader(data)).toThrow(DecryptionError)
    })
  })
})
