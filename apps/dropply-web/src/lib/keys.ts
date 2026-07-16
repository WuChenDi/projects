import { bytesToHex } from '@noble/hashes/utils.js'
import { base58 } from '@scure/base'
import { HDKey } from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

/** BIP44 first account, first address — same path the reference app uses. */
export const DEFAULT_DERIVATION_PATH = "m/44'/0'/0'/0/0"

const VALID_WORD_COUNTS = [12, 15, 18, 21, 24]

export function generateMnemonic(strength = 128): string {
  return bip39.generateMnemonic(wordlist, strength)
}

export function validateMnemonic(mnemonic: string): {
  isValid: boolean
  error?: string
  wordCount?: number
} {
  const trimmed = mnemonic.trim().replace(/\s+/g, ' ')
  if (!trimmed) return { isValid: false, error: 'empty' }
  const words = trimmed.split(' ')
  if (!VALID_WORD_COUNTS.includes(words.length)) {
    return { isValid: false, error: 'wordCount', wordCount: words.length }
  }
  if (!bip39.validateMnemonic(trimmed, wordlist)) {
    return { isValid: false, error: 'invalid', wordCount: words.length }
  }
  return { isValid: true, wordCount: words.length }
}

/**
 * BIP39 mnemonic → seed → BIP32 HD derive → secp256k1 key pair.
 * Private key = hex (32 bytes); public key = base58 of the compressed 33-byte
 * point. Only the mnemonic is ever persisted; the private key is re-derived.
 */
export function deriveKeyPair(mnemonic: string): {
  privateKey: string
  publicKey: string
} {
  const trimmed = mnemonic.trim().replace(/\s+/g, ' ')
  const seed = bip39.mnemonicToSeedSync(trimmed)
  const master = HDKey.fromMasterSeed(seed)
  const key = master.derive(DEFAULT_DERIVATION_PATH)
  if (!key.privateKey || !key.publicKey) {
    throw new Error('Failed to derive key pair')
  }
  return {
    privateKey: bytesToHex(key.privateKey),
    publicKey: base58.encode(key.publicKey),
  }
}

export function validateBase58PublicKey(key: string): {
  isValid: boolean
  error?: string
  pubKeyBytes?: Uint8Array
} {
  const trimmed = key.trim()
  if (trimmed.length < 40 || trimmed.length > 60) {
    return { isValid: false, error: 'length' }
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
    return { isValid: false, error: 'charset' }
  }
  try {
    const bytes = base58.decode(trimmed)
    if (bytes.length !== 33 && bytes.length !== 65) {
      return { isValid: false, error: 'byteLength' }
    }
    return { isValid: true, pubKeyBytes: bytes }
  } catch {
    return { isValid: false, error: 'decode' }
  }
}

export const isBase58String = (s: string) =>
  /^[1-9A-HJ-NP-Za-km-z]+$/.test(s.trim())
export const isHexString = (s: string) => /^[0-9a-f]+$/i.test(s.trim())
export const isMnemonicPhrase = (s: string) =>
  s.trim().split(/\s+/).length >= 12

export function sliceAddress(address: string, start = 6, end = 6): string {
  if (address.length <= start + end) return address
  return `${address.slice(0, start)}...${address.slice(-end)}`
}
