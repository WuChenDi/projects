import { describe, expect, it } from 'vitest'
import './polyfill'
import * as ecies from 'eciesjs'
import { InvalidDataError } from '../src/errors'
import {
  streamDecryptWithPrivateKey,
  streamEncryptWithPublicKey,
} from '../src/publickey'

describe('public-key encryption', () => {
  // eciesjs works with hex strings in test environments
  function generateKeyPair() {
    const privateKey = new ecies.PrivateKey()
    return {
      privKeyHex: privateKey.toHex() as unknown as Uint8Array,
      pubKeyHex: privateKey.publicKey.toHex() as unknown as Uint8Array,
    }
  }

  it('should encrypt and decrypt with ECIES key pair', async () => {
    const receiver = generateKeyPair()
    const content = 'Public key encrypted content'
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    const encrypted = await streamEncryptWithPublicKey({
      file,
      receiver: receiver.pubKeyHex as any,
    })

    expect(encrypted).toBeInstanceOf(Blob)
    expect(encrypted.size).toBeGreaterThan(0)

    const encryptedFile = new File([encrypted], 'test.txt.enc')
    const result = await streamDecryptWithPrivateKey({
      file: encryptedFile,
      receiver: receiver.privKeyHex,
    })

    const decryptedText = await result.file.text()
    expect(decryptedText).toBe(content)
    expect(result.signatureValid).toBeUndefined()
  })

  it('should fail decryption with wrong private key', async () => {
    const receiver = generateKeyPair()
    const wrongReceiver = generateKeyPair()
    const file = new File(['secret'], 'test.txt')

    const encrypted = await streamEncryptWithPublicKey({
      file,
      receiver: receiver.pubKeyHex as any,
    })

    const encryptedFile = new File([encrypted], 'test.txt.enc')

    await expect(
      streamDecryptWithPrivateKey({
        file: encryptedFile,
        receiver: wrongReceiver.privKeyHex,
      }),
    ).rejects.toThrow()
  })

  it('should throw without receiver on encrypt', async () => {
    const file = new File(['data'], 'test.txt')

    await expect(
      streamEncryptWithPublicKey({ file, receiver: undefined as any }),
    ).rejects.toThrow(InvalidDataError)
  })

  it('should throw without receiver on decrypt', async () => {
    const file = new File(['data'], 'test.txt')

    await expect(
      streamDecryptWithPrivateKey({ file, receiver: undefined as any }),
    ).rejects.toThrow(InvalidDataError)
  })

  it('should encrypt and decrypt binary data', async () => {
    const receiver = generateKeyPair()
    const data = new Uint8Array(512)
    for (let i = 0; i < 512; i++) data[i] = i % 256
    const file = new File([data], 'binary.bin')

    const encrypted = await streamEncryptWithPublicKey({
      file,
      receiver: receiver.pubKeyHex as any,
    })

    const encryptedFile = new File([encrypted], 'binary.bin.enc')
    const result = await streamDecryptWithPrivateKey({
      file: encryptedFile,
      receiver: receiver.privKeyHex,
    })

    const decrypted = new Uint8Array(await result.file.arrayBuffer())
    expect(decrypted).toEqual(data)
  })

  it('should call progress and stage callbacks', async () => {
    const receiver = generateKeyPair()
    const file = new File(['callback test'], 'test.txt')
    const stages: string[] = []

    await streamEncryptWithPublicKey({
      file,
      receiver: receiver.pubKeyHex as any,
      onStage: (stage) => stages.push(stage),
    })

    expect(stages.length).toBeGreaterThan(0)
    expect(stages[0]).toContain('Generating')
  })
})
