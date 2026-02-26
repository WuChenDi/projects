export interface FileInfo {
  name: string
  size: number
  type: string
  originalExtension?: string
}

export interface KeyPair {
  publicKey: string
  privateKey: string
}

export enum ModeEnum {
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT',
}

export enum InputModeEnum {
  FILE = 'FILE',
  MESSAGE = 'MESSAGE',
}

export enum StatusEnum {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ProcessResult {
  id: string
  mode: ModeEnum
  inputMode: InputModeEnum
  data: ArrayBuffer
  text?: string
  fileInfo?: FileInfo
  timestamp: number
  status: StatusEnum
  progress: number
  stage: string
  error?: string
  downloadUrl?: string
}
