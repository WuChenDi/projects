import { base64 } from '@scure/base'
import { MAGIC_BYTES } from './constants'
import {
  streamDecryptWithPassword,
  streamEncryptWithPassword,
} from './password'
import {
  streamDecryptWithPrivateKey,
  streamEncryptWithPublicKey,
} from './publickey'

export async function encryptText(
  text: string,
  password?: string,
  receiver?: Uint8Array,
  sender?: { privKeyBytes: Uint8Array },
) {
  const file = new File([text], 'source.txt', { type: 'text/plain' })
  let blob: Blob
  let prefix: string
  if (password) {
    blob = await streamEncryptWithPassword({
      file,
      password,
      receiver,
      sender,
    })
    prefix = MAGIC_BYTES.PASSWORD
  } else if (receiver) {
    blob = await streamEncryptWithPublicKey({ file, receiver, sender })
    prefix = sender ? MAGIC_BYTES.SIGNED : MAGIC_BYTES.PUBLIC_KEY
  } else {
    throw new Error('Either password or receiver is required')
  }

  const arrayBuffer = await blob.arrayBuffer()
  const base64String = base64.encode(new Uint8Array(arrayBuffer))
  return {
    blob,
    base64: `${prefix}${base64String}`,
  }
}

export async function decryptText(
  encryptedText: string,
  password?: string,
  receiver?: Uint8Array,
  sender?: Uint8Array,
) {
  const prefix = encryptedText.slice(0, 3)
  let base64Data = encryptedText
  if (
    prefix === MAGIC_BYTES.PASSWORD ||
    prefix === MAGIC_BYTES.PUBLIC_KEY ||
    prefix === MAGIC_BYTES.SIGNED
  ) {
    base64Data = encryptedText.slice(3)
  }

  const encryptedData = base64.decode(base64Data)
  const file = new File([encryptedData as BlobPart], 'encrypted.txt', {
    type: 'text/plain',
  })
  let result: { file: Blob; signatureValid?: boolean }
  if (password) {
    result = await streamDecryptWithPassword({
      file,
      password,
      receiver,
      sender,
    })
  } else if (receiver) {
    result = await streamDecryptWithPrivateKey({
      file,
      receiver,
      sender,
    })
  } else {
    throw new Error('Either password or receiver is required')
  }

  return {
    text: await result.file.text(),
    signatureValid: result.signatureValid,
  }
}
