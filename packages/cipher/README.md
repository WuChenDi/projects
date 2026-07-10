# @cdlab/cipher

Client-side stream cipher library — XChaCha20-Poly1305 encryption with Argon2id password derivation or ECIES public-key exchange, used by `SecureC` and `dropply-web` to encrypt files and text without ever sending plaintext to a server.

## Install / Usage

```json
{
  "dependencies": {
    "@cdlab/cipher": "workspace:*"
  }
}
```

### Password mode (Argon2id-derived key)

```ts
import { streamCrypto } from '@cdlab/cipher'

const encrypted = await streamCrypto.encrypt.withPassword({
  file, // File
  password: 'correct horse battery staple',
  onProgress: (pct) => console.log(pct),
  onStage: (stage) => console.log(stage),
})
// encrypted: Blob

const { file: decrypted } = await streamCrypto.decrypt.withPassword({
  file: encryptedFile, // File
  password: 'correct horse battery staple',
})
```

### Public-key mode (ECIES, optional signature)

```ts
import { streamCrypto } from '@cdlab/cipher'

const encrypted = await streamCrypto.encrypt.withPublicKey({
  file,
  receiver: receiverPublicKeyBytes, // Uint8Array
  sender: { privKeyBytes: senderPrivateKeyBytes }, // optional — signs the file
})

const { file: decrypted, signatureValid } = await streamCrypto.decrypt.withPrivateKey({
  file: encryptedFile,
  receiver: receiverPrivateKeyBytes, // Uint8Array
  sender: senderPublicKeyBytes, // optional — verifies the signature
})
```

### Text mode

```ts
import { textCrypto } from '@cdlab/cipher'

const { base64 } = await textCrypto.encrypt('secret message', 'my-password')
const { text, signatureValid } = await textCrypto.decrypt(base64, 'my-password')
```

## API / Exports

| Export | Kind | Description |
| --- | --- | --- |
| `streamCrypto.encrypt.withPassword` | function | Encrypts a `File` in chunks using an Argon2id-derived key. |
| `streamCrypto.encrypt.withPublicKey` | function | Encrypts a `File` for a receiver's ECIES public key; optionally signs with a `secp256k1` sender key. |
| `streamCrypto.decrypt.withPassword` | function | Decrypts a password-encrypted `File`. |
| `streamCrypto.decrypt.withPrivateKey` | function | Decrypts a public-key-encrypted `File`; optionally verifies the sender's signature. |
| `textCrypto.encrypt` | function | Encrypts a string (password or public-key mode) and returns `{ blob, base64 }`. |
| `textCrypto.decrypt` | function | Decrypts a base64 string produced by `textCrypto.encrypt` and returns `{ text, signatureValid }`. |
| `StreamCipher` | class | Low-level per-chunk XChaCha20-Poly1305 encrypt/decrypt with integrity hashing (`encryptChunk`, `decryptChunk`, `destroy`). |
| `parseStreamHeader` | function | Parses the magic-byte-prefixed stream header (salt/key material + chunk count) from raw bytes. |
| `detect` | function | Inspects a `File` or base64 string's magic bytes and returns `{ encryptionType, isText }` (`'pwd' | 'pubk' | 'signed' | 'unencrypted'`). |
| `CryptoError`, `EncryptionError`, `DecryptionError`, `InvalidDataError` | classes | Typed error hierarchy (`CryptoError` base, `code` property). |
| `ERROR_MESSAGES` | const | Shared error message strings used by the error classes. |
| `CONFIG`, `MAGIC_BYTES` | const | Tunable chunk/Argon2/size parameters and the per-mode magic byte prefixes (`constants.ts`). |
| Types: `StreamEncryptOptions`, `StreamDecryptOptions`, `StreamBaseOptions`, `StreamHeader`, `HeaderData`, `ChunkMetadata`, `ProgressCallback`, `StageCallback` | types | Public option/result shapes (`types.ts`). |

## Notes

- **Chunk format**: each stream starts with a magic-byte header (`MAGIC_BYTES.PASSWORD = 'ns1'`, `MAGIC_BYTES.PUBLIC_KEY = 'ns0'`, `MAGIC_BYTES.SIGNED = 'ns2'`) followed by encrypted chunks, each prefixed with size + SHA-256 integrity hash metadata. See `src/header.ts` and `src/stream-cipher.ts`.
- **Do not change** the chunk sizes or Argon2id parameters in `CONFIG` (`src/constants.ts`) without bumping the header/magic-byte version — existing ciphertexts encrypted under the old parameters would become unreadable.
- Password mode derives the symmetric key with `argon2id` (via `@noble/hashes`); public-key mode wraps a random symmetric key with `eciesjs` and optionally signs the file hash with `secp256k1` (via `@noble/curves`).
- Consumers: `SecureC` (file/text encryption UI, run in a Web Worker) and `dropply-web` (end-to-end encrypted file sharing).
- Built with `tsdown` (`pnpm --filter @cdlab/cipher build`, or `dev` for watch mode) — rebuild after edits so consumers resolve the updated `dist/` output.
- Tested with `vitest` + `happy-dom` (`pnpm --filter @cdlab/cipher test`).

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
