export const CONFIG = {
  CHUNK: {
    SIZE: 10 * 1024 * 1024, // 10MB chunks for processing
    BUFFER: 20 * 1024 * 1024, // 20MB buffer for streaming
    MAX_MEMORY: 100 * 1024 * 1024, // 100MB max memory per operation
  },
  ARGON2: {
    t: 3, // Time cost
    m: 1280, // Memory cost (in KiB)
    p: 4, // Parallelism
    maxmem: 2 ** 32 - 1, // Maximum memory (4GB)
  },
  SIZES: {
    SALT: 16, // Salt length in bytes
    NONCE: 12, // Nonce length for GCM
    SYM_KEY: 32, // Symmetric key length
    SIGNATURE: 64, // Signature length
    HEADER_MAX: 2048, // Maximum header size to read
  },
} as const

// Magic bytes for different encryption modes
export const MAGIC_BYTES = {
  PASSWORD: 'ns1',
  PUBLIC_KEY: 'ns0',
  SIGNED: 'ns2',
} as const

export type MagicBytesType = (typeof MAGIC_BYTES)[keyof typeof MAGIC_BYTES]
