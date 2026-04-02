import { xchacha20poly1305 as gcm } from '@noble/ciphers/chacha.js'
import {
  bytesToUtf8,
  concatBytes,
  managedNonce,
  utf8ToBytes,
} from '@noble/ciphers/utils.js'
import { argon2id } from '@noble/hashes/argon2.js'
import * as ecies from 'eciesjs'
import type { MagicBytesType } from './constants'
import { CONFIG, MAGIC_BYTES } from './constants'
import {
  DecryptionError,
  EncryptionError,
  ERROR_MESSAGES,
  InvalidDataError,
} from './errors'
import type { HeaderData, StreamHeader } from './types'

export function createStreamHeader(streamHeader: StreamHeader) {
  const header: HeaderData = {
    e: streamHeader.ext,
    c: streamHeader.totalChunks,
  }

  try {
    if (streamHeader.pwd) {
      const aes = managedNonce(gcm)(streamHeader.pwd.key)
      const headerJson = JSON.stringify(header)
      const headerBytes = utf8ToBytes(headerJson)
      const encodeHeader = aes.encrypt(headerBytes)

      const totalLength = CONFIG.SIZES.SALT + encodeHeader.length
      const headerLength = new Uint8Array(2)
      new DataView(headerLength.buffer).setUint16(0, totalLength, true)

      return concatBytes(
        utf8ToBytes(MAGIC_BYTES.PASSWORD),
        headerLength,
        streamHeader.pwd.salt,
        encodeHeader,
      )
    }

    if (streamHeader.key) {
      const magicBytes = streamHeader.key.signature
        ? MAGIC_BYTES.SIGNED
        : MAGIC_BYTES.PUBLIC_KEY
      header.s = streamHeader.key.signature
      const headerJson = JSON.stringify(header)
      const headerBytes = utf8ToBytes(headerJson)
      const aes = managedNonce(gcm)(streamHeader.key.key)

      const encodeHeader = aes.encrypt(headerBytes)
      const keyLength = streamHeader.key.encryptedKey.length

      const totalLength = 2 + keyLength + encodeHeader.length
      const headerLength = new Uint8Array(2)
      new DataView(headerLength.buffer).setUint16(0, totalLength, true)

      const keyLengthBytes = new Uint8Array(2)
      new DataView(keyLengthBytes.buffer).setUint16(0, keyLength, true)

      return concatBytes(
        utf8ToBytes(magicBytes),
        headerLength,
        keyLengthBytes,
        streamHeader.key.encryptedKey,
        encodeHeader,
      )
    }
  } catch (error) {
    throw new EncryptionError(
      `Failed to create header: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export function parseStreamHeader(
  data: Uint8Array,
  password?: string,
  receiver?: Uint8Array,
) {
  try {
    const magicBytes = bytesToUtf8(data.slice(0, 3))
    if (!Object.values(MAGIC_BYTES).includes(magicBytes as MagicBytesType)) {
      throw new Error(ERROR_MESSAGES.INVALID_FORMAT)
    }

    const headerLengthBytes = data.slice(3, 5)
    const totalHeaderLength = new DataView(
      headerLengthBytes.buffer,
      headerLengthBytes.byteOffset,
    ).getUint16(0, true)
    const isPasswordMode = magicBytes === MAGIC_BYTES.PASSWORD
    const headerOffset = 5

    if (isPasswordMode) {
      const salt = data.slice(headerOffset, headerOffset + CONFIG.SIZES.SALT)
      const encryptedHeaderBytes = data.slice(
        headerOffset + CONFIG.SIZES.SALT,
        totalHeaderLength + headerOffset,
      )

      if (!password) {
        throw new InvalidDataError(ERROR_MESSAGES.PASSWORD_REQUIRED)
      }
      const key = argon2id(password, salt, CONFIG.ARGON2)
      const aes = managedNonce(gcm)(key)

      const headerBytes = aes.decrypt(encryptedHeaderBytes)
      const headerJson = bytesToUtf8(headerBytes)
      const header = JSON.parse(headerJson) as HeaderData

      return { header, headerLength: totalHeaderLength + headerOffset, key }
    } else if (receiver) {
      const keyLengthBytes = data.slice(headerOffset, headerOffset + 2)
      const keyLength = new DataView(
        keyLengthBytes.buffer,
        keyLengthBytes.byteOffset,
      ).getUint16(0, true)

      const encryptedKey = data.slice(
        headerOffset + 2,
        headerOffset + 2 + keyLength,
      )

      const encryptedHeaderStart = headerOffset + 2 + keyLength
      const encryptedHeaderEnd = headerOffset + totalHeaderLength
      const encryptedHeaderBytes = data.slice(
        encryptedHeaderStart,
        encryptedHeaderEnd,
      )

      const decryptedKey = ecies.decrypt(receiver, encryptedKey)
      if (!decryptedKey) {
        throw new InvalidDataError(ERROR_MESSAGES.MISSING_DECRYPT_PARAMS)
      }
      // Copy to owned buffer — ecies.decrypt returns a slice of the Node.js
      // Buffer pool, so secureClear on its .buffer would corrupt unrelated data.
      const symmetricKey = new Uint8Array(decryptedKey)
      const aes = managedNonce(gcm)(symmetricKey)
      const headerBytes = aes.decrypt(encryptedHeaderBytes)
      const headerJson = bytesToUtf8(headerBytes)
      const header = JSON.parse(headerJson) as HeaderData

      return {
        header,
        headerLength: headerOffset + totalHeaderLength,
        signature: header.s,
        key: symmetricKey,
      }
    }
  } catch (error) {
    throw new DecryptionError(
      `Failed to parse header: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
