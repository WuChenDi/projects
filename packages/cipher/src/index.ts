export { CONFIG, MAGIC_BYTES } from './constants'
export { detect } from './detect'
export {
  CryptoError,
  DecryptionError,
  EncryptionError,
  ERROR_MESSAGES,
  InvalidDataError,
} from './errors'
export { parseStreamHeader } from './header'
export {
  streamDecryptWithPassword,
  streamEncryptWithPassword,
} from './password'
export {
  streamDecryptWithPrivateKey,
  streamEncryptWithPublicKey,
} from './publickey'
export { StreamCipher } from './stream-cipher'
export { decryptText, encryptText } from './text'

export type {
  ChunkMetadata,
  HeaderData,
  ProgressCallback,
  StageCallback,
  StreamBaseOptions,
  StreamDecryptOptions,
  StreamEncryptOptions,
  StreamHeader,
} from './types'

// Convenience grouped exports matching original API
import {
  streamDecryptWithPassword,
  streamEncryptWithPassword,
} from './password'
import {
  streamDecryptWithPrivateKey,
  streamEncryptWithPublicKey,
} from './publickey'
import { decryptText, encryptText } from './text'

export const streamCrypto = {
  encrypt: {
    withPassword: streamEncryptWithPassword,
    withPublicKey: streamEncryptWithPublicKey,
  },
  decrypt: {
    withPassword: streamDecryptWithPassword,
    withPrivateKey: streamDecryptWithPrivateKey,
  },
}

export const textCrypto = {
  encrypt: encryptText,
  decrypt: decryptText,
}
