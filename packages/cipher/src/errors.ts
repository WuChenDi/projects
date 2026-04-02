export const ERROR_MESSAGES = {
  PASSWORD_REQUIRED: 'Password is required',
  INVALID_FORMAT: 'Invalid format',
  RECEIVER_REQUIRED: 'Receiver public key is required',
  PRIVATE_KEY_REQUIRED: 'Receiver private key is required',
  MISSING_DECRYPT_PARAMS: 'Missing decryption parameters',
  PASSWORD_MODE_REQUIRED: 'Password required for ns1 format',
  PUBKEY_MODE_REQUIRED: 'Private key required for ns0/ns2 format',
  NOT_PASSWORD_ENCRYPTED: 'File is not password encrypted',
  NOT_PUBKEY_ENCRYPTED: 'File is not public key encrypted',
  CHUNK_READ_FAILED: 'Failed to read file chunk',
  CHUNK_INTEGRITY_FAILED: 'Chunk integrity check failed',
  SIGNATURE_VERIFY_FAILED: 'Signature verification failed',
  INVALID_ENCRYPTION_MODE:
    'Invalid encryption mode: must provide either password or receiver',
} as const

export class CryptoError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'CryptoError'
  }
}

export class InvalidDataError extends CryptoError {
  constructor(message: string) {
    super(message, 'INVALID_DATA')
  }
}

export class DecryptionError extends CryptoError {
  constructor(message: string) {
    super(message, 'DECRYPTION_FAILED')
  }
}

export class EncryptionError extends CryptoError {
  constructor(message: string) {
    super(message, 'ENCRYPTION_FAILED')
  }
}
