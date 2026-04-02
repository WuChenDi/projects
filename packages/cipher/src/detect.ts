import { bytesToUtf8 } from '@noble/ciphers/utils.js'
import { MAGIC_BYTES } from './constants'

export async function detect(fileOrBase64: File | string) {
  try {
    const ENCRYPTION_TYPE_MAP: Record<string, 'pwd' | 'pubk' | 'signed'> = {
      [MAGIC_BYTES.PASSWORD]: 'pwd',
      [MAGIC_BYTES.PUBLIC_KEY]: 'pubk',
      [MAGIC_BYTES.SIGNED]: 'signed',
    }

    const isText = typeof fileOrBase64 === 'string'
    let magic: string

    if (isText) {
      magic = fileOrBase64?.slice(0, 3) || ''
    } else {
      const headerData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(fileOrBase64.slice(0, 3))
      })
      magic = bytesToUtf8(new Uint8Array(headerData))
    }

    const encryptionType = ENCRYPTION_TYPE_MAP[magic] || 'unencrypted'
    return { encryptionType, isText }
  } catch {
    return {
      encryptionType: 'unencrypted',
      isText: typeof fileOrBase64 === 'string',
    }
  }
}
