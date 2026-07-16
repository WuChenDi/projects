import { parseStreamHeader, streamCrypto, textCrypto } from '@cdlab/cipher'
import { hexToBytes } from '@noble/hashes/utils.js'
import { base58 } from '@scure/base'
import { clampProgress, generateDownloadFilename } from '@/lib/crypto-utils'
import { ModeEnum } from '@/types/crypto'
import type { EncryptionMode } from '@/types/keys'

interface WorkerInput {
  mode: keyof typeof ModeEnum
  encryptionMode: EncryptionMode
  file?: File
  filename?: string
  text?: string
  password?: string
  /** Base58 recipient public key (public-key encrypt). */
  publicKey?: string
  /** Hex 64-char own private key (public-key decrypt). */
  privateKey?: string
  isTextMode: boolean
}

// Web Worker for password- and public-key-based encryption/decryption.
self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const {
    mode,
    encryptionMode,
    file,
    filename,
    text,
    password,
    publicKey,
    privateKey,
    isTextMode,
  } = e.data

  const isEncrypt = mode === ModeEnum.ENCRYPT
  const isPubk = encryptionMode === 'publickey'

  try {
    self.postMessage({ progress: 0, stage: 'Starting...' })

    // Resolve key material once. In public-key mode, `receiver` is the recipient
    // public key on encrypt and the own private key on decrypt (the cipher lib
    // uses the same param name for both directions).
    let receiver: Uint8Array | undefined
    let pwd: string | undefined
    if (isPubk) {
      if (isEncrypt) {
        if (!publicKey) throw new Error('Recipient public key not provided')
        receiver = base58.decode(publicKey.trim())
      } else {
        if (!privateKey || !/^[0-9a-f]{64}$/i.test(privateKey.trim())) {
          throw new Error('A valid 64-character hex private key is required')
        }
        receiver = hexToBytes(privateKey.trim())
      }
    } else {
      if (!password) throw new Error('Password not provided')
      pwd = password
    }

    if (isTextMode) {
      if (!text) throw new Error('Text input not provided')
      self.postMessage({ progress: 10, stage: 'Preparing text processing...' })

      if (isEncrypt) {
        const result = isPubk
          ? await textCrypto.encrypt(text, undefined, receiver)
          : await textCrypto.encrypt(text, pwd)
        self.postMessage({ progress: 100, stage: 'Complete!' })
        self.postMessage({
          data: {
            data: result.blob,
            base64: result.base64,
            filename: generateDownloadFilename(mode, true),
          },
        })
      } else {
        const result = isPubk
          ? await textCrypto.decrypt(text.trim(), undefined, receiver)
          : await textCrypto.decrypt(text.trim(), pwd)
        self.postMessage({ progress: 100, stage: 'Complete!' })
        self.postMessage({
          data: {
            data: new Blob([result.text], { type: 'text/plain' }),
            base64: result.text,
            filename: generateDownloadFilename(mode, true),
          },
        })
      }
      return
    }

    // File mode
    if (!file || !filename) throw new Error('File or filename not provided')

    if (isEncrypt) {
      self.postMessage({ progress: 10, stage: 'Preparing encryption...' })
      const onProgress = (progress: number) => {
        const scaled = 10 + (clampProgress(progress) / 100) * 85
        self.postMessage({
          progress: Math.min(scaled, 95),
          stage: `Encrypting... ${Math.round(progress)}%`,
        })
      }
      const onStage = (stage: string) => self.postMessage({ stage })

      const result = isPubk
        ? await streamCrypto.encrypt.withPublicKey({
            file,
            receiver: receiver as Uint8Array,
            onProgress,
            onStage,
          })
        : await streamCrypto.encrypt.withPassword({
            file,
            password: pwd as string,
            onProgress,
            onStage,
          })

      self.postMessage({ progress: 100, stage: 'Complete!' })
      self.postMessage({
        data: {
          data: result,
          filename: generateDownloadFilename(mode, false, filename),
        },
      })
    } else {
      self.postMessage({ progress: 10, stage: 'Reading header...' })

      const headerData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(new Error('Failed to read file header'))
        reader.readAsArrayBuffer(file.slice(0, 2048))
      })

      const parseResult = isPubk
        ? parseStreamHeader(new Uint8Array(headerData), undefined, receiver)
        : parseStreamHeader(new Uint8Array(headerData), pwd, undefined)

      if (!parseResult) throw new Error('Failed to parse stream header')
      const originalExtension = parseResult.header.e || 'bin'

      self.postMessage({ progress: 20, stage: 'Preparing decryption...' })
      const onProgress = (progress: number) => {
        const scaled = 20 + (clampProgress(progress) / 100) * 75
        self.postMessage({
          progress: Math.min(scaled, 95),
          stage: `Decrypting... ${Math.round(progress)}%`,
        })
      }
      const onStage = (stage: string) => self.postMessage({ stage })

      const result = isPubk
        ? await streamCrypto.decrypt.withPrivateKey({
            file,
            receiver: receiver as Uint8Array,
            onProgress,
            onStage,
          })
        : await streamCrypto.decrypt.withPassword({
            file,
            password: pwd as string,
            onProgress,
            onStage,
          })

      self.postMessage({ progress: 100, stage: 'Complete!' })
      self.postMessage({
        data: {
          data: result.file,
          filename: generateDownloadFilename(
            mode,
            false,
            undefined,
            originalExtension,
          ),
          originalExtension,
        },
      })
    }
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'An error occurred',
    })
  }
}
