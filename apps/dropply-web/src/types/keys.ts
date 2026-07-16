/** An owned key pair. Only the mnemonic is persisted; the private key is
 * re-derived on demand via `deriveKeyPair`. */
export interface KeyPair {
  publicKey: string
  mnemonic?: string
  note: string
}

/** A saved recipient (receiver) public key. */
export interface PublicKey {
  publicKey: string
  note: string
}

/** Local encrypt/decrypt key mode. */
export type EncryptionMode = 'password' | 'publickey'
