import { describe, expect, it } from 'vitest'
import './polyfill'
import { InvalidDataError } from '../src/errors'
import {
  streamDecryptWithPassword,
  streamEncryptWithPassword,
} from '../src/password'

describe('password encryption', () => {
  const password = 'strong-test-password-!@#$'

  it('should encrypt and decrypt a small text file', async () => {
    const content = 'Hello, this is a test file for password encryption.'
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const encrypted = await streamEncryptWithPassword({ file, password })
    expect(encrypted).toBeInstanceOf(Blob)
    expect(encrypted.size).toBeGreaterThan(0)

    const encryptedFile = new File([encrypted], 'test.txt.enc')
    const result = await streamDecryptWithPassword({
      file: encryptedFile,
      password,
    })

    const decryptedText = await result.file.text()
    expect(decryptedText).toBe(content)
  })

  it('should encrypt and decrypt binary data', async () => {
    const data = new Uint8Array(256)
    for (let i = 0; i < 256; i++) data[i] = i
    const file = new File([data], 'binary.bin', {
      type: 'application/octet-stream',
    })

    const encrypted = await streamEncryptWithPassword({ file, password })
    const encryptedFile = new File([encrypted], 'binary.bin.enc')
    const result = await streamDecryptWithPassword({
      file: encryptedFile,
      password,
    })

    const decryptedBuffer = new Uint8Array(await result.file.arrayBuffer())
    expect(decryptedBuffer).toEqual(data)
  })

  it('should fail decryption with wrong password', async () => {
    const file = new File(['secret data'], 'secret.txt')

    const encrypted = await streamEncryptWithPassword({ file, password })
    const encryptedFile = new File([encrypted], 'secret.txt.enc')

    await expect(
      streamDecryptWithPassword({
        file: encryptedFile,
        password: 'wrong-password',
      }),
    ).rejects.toThrow()
  })

  it('should throw without password on encrypt', async () => {
    const file = new File(['data'], 'test.txt')

    await expect(
      streamEncryptWithPassword({ file, password: undefined as any }),
    ).rejects.toThrow(InvalidDataError)
  })

  it('should throw without password on decrypt', async () => {
    const file = new File(['data'], 'test.txt')

    await expect(
      streamDecryptWithPassword({ file, password: undefined as any }),
    ).rejects.toThrow(InvalidDataError)
  })

  it('should call progress and stage callbacks', async () => {
    const content = 'callback test content'
    const file = new File([content], 'callback.txt')

    const stages: string[] = []
    const progressValues: number[] = []

    const encrypted = await streamEncryptWithPassword({
      file,
      password,
      onStage: (stage) => stages.push(stage),
      onProgress: (progress) => progressValues.push(progress),
    })

    expect(stages.length).toBeGreaterThan(0)
    expect(progressValues.length).toBeGreaterThan(0)

    // Decrypt with callbacks too
    const decryptStages: string[] = []
    const encryptedFile = new File([encrypted], 'callback.txt.enc')

    await streamDecryptWithPassword({
      file: encryptedFile,
      password,
      onStage: (stage) => decryptStages.push(stage),
    })

    expect(decryptStages.length).toBeGreaterThan(0)
  })

  it('should produce different ciphertext for same plaintext (random salt)', async () => {
    const file = new File(['same content'], 'test.txt')

    const encrypted1 = await streamEncryptWithPassword({ file, password })
    const encrypted2 = await streamEncryptWithPassword({ file, password })

    const buf1 = new Uint8Array(await encrypted1.arrayBuffer())
    const buf2 = new Uint8Array(await encrypted2.arrayBuffer())

    // Different salt = different ciphertext
    expect(buf1).not.toEqual(buf2)
  })
})
