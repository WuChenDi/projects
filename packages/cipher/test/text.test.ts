import { describe, expect, it } from 'vitest'
import './polyfill'
import * as ecies from 'eciesjs'
import { MAGIC_BYTES } from '../src/constants'
import { decryptText, encryptText } from '../src/text'

describe('text encryption', () => {
  describe('password mode', () => {
    const password = 'text-encryption-password'

    it('should encrypt and decrypt text', async () => {
      const plaintext = 'Hello, this is a secret message!'

      const encrypted = await encryptText(plaintext, password)
      expect(encrypted.blob).toBeInstanceOf(Blob)
      expect(encrypted.base64).toBeDefined()
      expect(encrypted.base64.startsWith(MAGIC_BYTES.PASSWORD)).toBe(true)

      const decrypted = await decryptText(encrypted.base64, password)
      expect(decrypted.text).toBe(plaintext)
    })

    it('should encrypt and decrypt unicode text', async () => {
      const plaintext = 'Unicode: 你好世界 🌍 こんにちは émojis'

      const encrypted = await encryptText(plaintext, password)
      const decrypted = await decryptText(encrypted.base64, password)

      expect(decrypted.text).toBe(plaintext)
    })

    it('should encrypt and decrypt empty text', async () => {
      const plaintext = ''

      const encrypted = await encryptText(plaintext, password)
      const decrypted = await decryptText(encrypted.base64, password)

      expect(decrypted.text).toBe(plaintext)
    })

    it('should fail with wrong password', async () => {
      const encrypted = await encryptText('secret', password)

      await expect(
        decryptText(encrypted.base64, 'wrong-password'),
      ).rejects.toThrow()
    })

    it('should produce different ciphertext each time', async () => {
      const plaintext = 'same text'

      const encrypted1 = await encryptText(plaintext, password)
      const encrypted2 = await encryptText(plaintext, password)

      expect(encrypted1.base64).not.toBe(encrypted2.base64)
    })
  })

  describe('public-key mode', () => {
    function generateKeyPair() {
      const privateKey = new ecies.PrivateKey()
      return {
        privKeyHex: privateKey.toHex() as unknown as Uint8Array,
        pubKeyHex: privateKey.publicKey.toHex() as unknown as Uint8Array,
      }
    }

    it('should encrypt and decrypt text with public key', async () => {
      const receiver = generateKeyPair()
      const plaintext = 'Public key encrypted text'

      const encrypted = await encryptText(
        plaintext,
        undefined,
        receiver.pubKeyHex,
      )
      expect(encrypted.base64.startsWith(MAGIC_BYTES.PUBLIC_KEY)).toBe(true)

      const decrypted = await decryptText(
        encrypted.base64,
        undefined,
        receiver.privKeyHex,
      )
      expect(decrypted.text).toBe(plaintext)
    })
  })

  describe('validation', () => {
    it('should throw without password or receiver', async () => {
      await expect(encryptText('data')).rejects.toThrow(
        'Either password or receiver is required',
      )
    })

    it('should throw on decrypt without password or receiver', async () => {
      await expect(decryptText('ns1somedata')).rejects.toThrow()
    })
  })
})
