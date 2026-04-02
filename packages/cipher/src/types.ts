export interface HeaderData {
  e: string // extension
  c: number // chunk count
  s?: Uint8Array // signature
}

export interface StreamHeader {
  ext: string
  totalChunks: number
  pwd?: {
    key: Uint8Array
    salt: Uint8Array
  }
  key?: {
    receiver: Uint8Array
    key: Uint8Array
    encryptedKey: Uint8Array
    signature?: Uint8Array
  }
}

export interface ChunkMetadata {
  size: number
  hash: Uint8Array
}

export type ProgressCallback = (progress: number) => void
export type StageCallback = (stage: string) => void

export interface StreamBaseOptions {
  file: File
  password?: string
  receiver?: Uint8Array
  onProgress?: ProgressCallback
  onStage?: StageCallback
}

export interface StreamEncryptOptions extends StreamBaseOptions {
  sender?: { privKeyBytes: Uint8Array }
}

export interface StreamDecryptOptions extends StreamBaseOptions {
  sender?: Uint8Array
}
