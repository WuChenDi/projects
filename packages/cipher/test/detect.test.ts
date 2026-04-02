import { describe, expect, it } from 'vitest'
import './polyfill'
import { MAGIC_BYTES } from '../src/constants'
import { detect } from '../src/detect'

describe('detect', () => {
  describe('string detection', () => {
    it('should detect password-encrypted string', async () => {
      const result = await detect(`${MAGIC_BYTES.PASSWORD}somebase64data`)
      expect(result.encryptionType).toBe('pwd')
      expect(result.isText).toBe(true)
    })

    it('should detect public-key encrypted string', async () => {
      const result = await detect(`${MAGIC_BYTES.PUBLIC_KEY}somebase64data`)
      expect(result.encryptionType).toBe('pubk')
      expect(result.isText).toBe(true)
    })

    it('should detect signed encrypted string', async () => {
      const result = await detect(`${MAGIC_BYTES.SIGNED}somebase64data`)
      expect(result.encryptionType).toBe('signed')
      expect(result.isText).toBe(true)
    })

    it('should detect unencrypted string', async () => {
      const result = await detect('Hello, World!')
      expect(result.encryptionType).toBe('unencrypted')
      expect(result.isText).toBe(true)
    })

    it('should handle empty string', async () => {
      const result = await detect('')
      expect(result.encryptionType).toBe('unencrypted')
      expect(result.isText).toBe(true)
    })

    it('should handle short string (< 3 chars)', async () => {
      const result = await detect('ab')
      expect(result.encryptionType).toBe('unencrypted')
      expect(result.isText).toBe(true)
    })
  })

  describe('file detection', () => {
    it('should detect password-encrypted file', async () => {
      const content = new TextEncoder().encode(
        `${MAGIC_BYTES.PASSWORD}restofdata`,
      )
      const file = new File([content], 'encrypted.enc')

      const result = await detect(file)
      expect(result.encryptionType).toBe('pwd')
      expect(result.isText).toBe(false)
    })

    it('should detect public-key encrypted file', async () => {
      const content = new TextEncoder().encode(
        `${MAGIC_BYTES.PUBLIC_KEY}restofdata`,
      )
      const file = new File([content], 'encrypted.enc')

      const result = await detect(file)
      expect(result.encryptionType).toBe('pubk')
      expect(result.isText).toBe(false)
    })

    it('should detect unencrypted file', async () => {
      const file = new File(['plain text content'], 'readme.txt')

      const result = await detect(file)
      expect(result.encryptionType).toBe('unencrypted')
      expect(result.isText).toBe(false)
    })
  })
})
