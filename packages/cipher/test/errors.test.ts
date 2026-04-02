import { describe, expect, it } from 'vitest'
import {
  CryptoError,
  DecryptionError,
  EncryptionError,
  ERROR_MESSAGES,
  InvalidDataError,
} from '../src/errors'

describe('errors', () => {
  describe('CryptoError', () => {
    it('should create with message and code', () => {
      const error = new CryptoError('test message', 'TEST_CODE')
      expect(error.message).toBe('test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.name).toBe('CryptoError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('InvalidDataError', () => {
    it('should set code to INVALID_DATA', () => {
      const error = new InvalidDataError('bad data')
      expect(error.code).toBe('INVALID_DATA')
      expect(error.name).toBe('CryptoError')
      expect(error).toBeInstanceOf(CryptoError)
    })
  })

  describe('DecryptionError', () => {
    it('should set code to DECRYPTION_FAILED', () => {
      const error = new DecryptionError('decrypt failed')
      expect(error.code).toBe('DECRYPTION_FAILED')
      expect(error).toBeInstanceOf(CryptoError)
    })
  })

  describe('EncryptionError', () => {
    it('should set code to ENCRYPTION_FAILED', () => {
      const error = new EncryptionError('encrypt failed')
      expect(error.code).toBe('ENCRYPTION_FAILED')
      expect(error).toBeInstanceOf(CryptoError)
    })
  })

  describe('ERROR_MESSAGES', () => {
    it('should define all expected messages', () => {
      expect(ERROR_MESSAGES.PASSWORD_REQUIRED).toBeDefined()
      expect(ERROR_MESSAGES.INVALID_FORMAT).toBeDefined()
      expect(ERROR_MESSAGES.RECEIVER_REQUIRED).toBeDefined()
      expect(ERROR_MESSAGES.PRIVATE_KEY_REQUIRED).toBeDefined()
      expect(ERROR_MESSAGES.CHUNK_INTEGRITY_FAILED).toBeDefined()
      expect(ERROR_MESSAGES.NOT_PASSWORD_ENCRYPTED).toBeDefined()
      expect(ERROR_MESSAGES.NOT_PUBKEY_ENCRYPTED).toBeDefined()
    })
  })
})
