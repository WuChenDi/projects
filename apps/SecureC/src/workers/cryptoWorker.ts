import { clampProgress, generateDownloadFilename } from '@/lib'
import { parseStreamHeader, streamCrypto, textCrypto } from '@/lib/crypto'
import { ModeEnum } from '@/types'

interface WorkerInput {
  mode: keyof typeof ModeEnum
  file?: File
  filename?: string
  text?: string
  password: string
  isTextMode: boolean
}

// Web Worker for password-based encryption/decryption tasks
self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { mode, file, filename, text, password, isTextMode } = e.data

  try {
    self.postMessage({ progress: 0, stage: 'Starting...' })

    if (!password) {
      throw new Error('Password not provided')
    }

    if (isTextMode) {
      // Text mode
      if (!text) throw new Error('Text input not provided')

      self.postMessage({ progress: 10, stage: 'Preparing text processing...' })

      if (mode === ModeEnum.ENCRYPT) {
        const result = await textCrypto.encrypt(text, password)
        const outputFilename = generateDownloadFilename(mode, true)

        self.postMessage({ progress: 100, stage: 'Complete!' })
        self.postMessage({
          data: {
            data: result.blob,
            base64: result.base64,
            filename: outputFilename,
          },
        })
      } else {
        const result = await textCrypto.decrypt(text.trim(), password)
        const outputFilename = generateDownloadFilename(mode, true)

        self.postMessage({ progress: 100, stage: 'Complete!' })
        self.postMessage({
          data: {
            data: new Blob([result.text], { type: 'text/plain' }),
            base64: result.text,
            filename: outputFilename,
          },
        })
      }
    } else {
      // File mode
      if (!file || !filename) throw new Error('File or filename not provided')

      if (mode === ModeEnum.ENCRYPT) {
        self.postMessage({ progress: 10, stage: 'Preparing encryption...' })

        const result = await streamCrypto.encrypt.withPassword({
          file,
          password,
          onProgress: (progress) => {
            const scaledProgress = 10 + (clampProgress(progress) / 100) * 85
            self.postMessage({
              progress: Math.min(scaledProgress, 95),
              stage: `Encrypting... ${Math.round(progress)}%`,
            })
          },
          onStage: (stage) => {
            self.postMessage({ stage })
          },
        })

        const outputFilename = generateDownloadFilename(mode, false, filename)

        self.postMessage({ progress: 100, stage: 'Complete!' })
        self.postMessage({
          data: {
            data: result,
            filename: outputFilename,
          },
        })
      } else {
        self.postMessage({ progress: 10, stage: 'Reading header...' })

        // Read header to get original extension
        const headerData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = () => reject(new Error('Failed to read file header'))
          reader.readAsArrayBuffer(file.slice(0, 2048))
        })

        const parseResult = parseStreamHeader(
          new Uint8Array(headerData),
          password,
          undefined,
        )

        if (!parseResult) {
          throw new Error('Failed to parse stream header')
        }

        const { header } = parseResult
        const originalExtension = header.e || 'bin'

        self.postMessage({ progress: 20, stage: 'Preparing decryption...' })

        const result = await streamCrypto.decrypt.withPassword({
          file,
          password,
          onProgress: (progress) => {
            const scaledProgress = 20 + (clampProgress(progress) / 100) * 75
            self.postMessage({
              progress: Math.min(scaledProgress, 95),
              stage: `Decrypting... ${Math.round(progress)}%`,
            })
          },
          onStage: (stage) => {
            self.postMessage({ stage })
          },
        })

        const outputFilename = generateDownloadFilename(
          mode,
          false,
          undefined,
          originalExtension,
        )

        self.postMessage({ progress: 100, stage: 'Complete!' })

        self.postMessage({
          data: {
            data: result.file,
            filename: outputFilename,
            originalExtension,
          },
        })
      }
    }
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'An error occurred',
    })
  }
}
