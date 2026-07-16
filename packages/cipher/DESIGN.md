# @cdlab/cipher — Design

> A client-side stream cipher library. It encrypts an arbitrarily large `File`
> in 10 MB chunks with XChaCha20-Poly1305, establishing the key from either an
> Argon2id password hash or an ECIES-wrapped random key, and writes a
> self-describing binary stream: a magic-prefixed encrypted header followed by
> per-chunk `[size][sha256]` + ciphertext records. Everything runs in the
> caller's runtime (browser, Web Worker, or Node) — no server, no network, no
> persisted state.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — source doc-comments and reviews reference them as
`design §N`. `src/constants.ts`, `src/header.ts`, and `src/stream-cipher.ts`
together define the **on-disk format**; changing them is a format-version change
(§8), not an ordinary edit.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [The chunk pipeline](#3-the-chunk-pipeline)
4. [Wire format](#4-wire-format)
5. [Key establishment modes](#5-key-establishment-modes)
6. [Integrity, signatures & key hygiene](#6-integrity-signatures--key-hygiene)
7. [Memory & responsiveness](#7-memory--responsiveness)
8. [The format contract](#8-the-format-contract)
9. [Errors & detection](#9-errors--detection)
10. [Build, test & consumption](#10-build-test--consumption)

---

## 1. Background & goals

For a server to be zero-knowledge, plaintext must be encrypted before it leaves
the client. Doing that in a browser well is the whole problem: `crypto.subtle`
encrypts a whole buffer at once (fatal for large files), a synchronous crypto
loop freezes the tab, and each use case (a password the user types vs. a
recipient's public key) needs a different key-establishment path but the same
ciphertext container.

`@cdlab/cipher` is the shared crypto core behind `dropply-web`. It
holds itself to these goals:

- **G1 — Stream, don't buffer.** Encrypt a `File` in fixed 10 MB slices so the
  full plaintext is never resident; output is a `Blob` assembled from chunk
  parts.
- **G2 — Non-blocking.** Yield to the event loop between chunks and surface
  `onProgress` / `onStage`, so a tab or Web Worker stays responsive on large
  files.
- **G3 — One container, two modes.** Password (Argon2id) and public-key (ECIES,
  optionally signed) share a single header + chunk format, distinguished only by
  a 3-byte magic prefix.
- **G4 — Self-describing.** A ciphertext identifies its own mode; `detect()`
  classifies it before a decrypt path is chosen.
- **G5 — Defense in depth.** AEAD confidentiality+authenticity *and* a per-chunk
  SHA-256 verified in constant time; keys wiped after use.
- **G6 — Runtime-agnostic.** Pure-JS primitives (`@noble/*`, `eciesjs`) and a
  `getRandomValues` shim (`@cdlab/uncrypto`) — runs in browsers, Workers, and
  Node with no platform code.

### Non-goals

- **Not a versioned/upgradable format.** There is no in-band version field to
  negotiate. The magic bytes + constants *are* the version; evolving them is §8.
- **Not a key manager.** No key generation, storage, or transport. Callers pass
  passwords and raw key bytes; ECIES key pairs are generated out of band.
- **Not a generic buffer AEAD.** The public API is `File`-centric by design
  (text is wrapped into a `File`), because the consumers are browser file tools.
- **No streaming random access.** Decrypt walks chunks in order from the header;
  there is no seek/partial-decrypt.

---

## 2. Architecture

A build-only library (`tsdown` → ESM + CJS + `.d.ts`). Single barrel
`src/index.ts` exposes two grouped facades (`streamCrypto`, `textCrypto`) plus
low-level exports (`StreamCipher`, `parseStreamHeader`, `detect`, error classes,
`CONFIG`, `MAGIC_BYTES`, types).

```
                      caller (browser / Web Worker / Node)
                                     │
                 streamCrypto.{encrypt,decrypt}.{withPassword,withPrivateKey/PublicKey}
                 textCrypto.{encrypt,decrypt}   (string ⇄ base64 wrappers)
                                     │
        ┌────────────────────────────┼────────────────────────────┐
   password.ts                  publickey.ts                     text.ts
   (Argon2id KDF)          (ECIES wrap + secp256k1 sign)   (File-wrap + base64)
        └──────────────┬─────────────┴──────────────┬─────────────┘
                       │                             │
                  header.ts                    stream-cipher.ts
             (create/parse header)        (per-chunk AEAD + SHA-256)
                       │                             │
        constants.ts (format contract) · utils.ts (File I/O, memory, secureClear) · errors.ts · types.ts
```

Module roles:

| Module | Role |
| --- | --- |
| `src/constants.ts` | The frozen contract: `CONFIG` (chunk/Argon2/size params) + `MAGIC_BYTES`. See §4, §8. |
| `src/header.ts` | `createStreamHeader` / `parseStreamHeader` — the two header layouts, both with an AEAD-encrypted JSON body. |
| `src/stream-cipher.ts` | `StreamCipher` — per-chunk encrypt/decrypt, SHA-256 integrity, key `destroy`. |
| `src/password.ts` | Password mode orchestration: Argon2id KDF → header → chunk loop → cleanup. |
| `src/publickey.ts` | Public-key mode orchestration: ECIES key wrap + optional secp256k1 signature. |
| `src/text.ts` | Thin string↔`File`↔base64 layer over the stream functions. |
| `src/detect.ts` | Reads the first 3 bytes → `{ encryptionType, isText }`. |
| `src/utils.ts` | `readFileChunk`, `readAndExtractChunk`, metadata (de)serialize, `hashFile`, `secureClear`, `waitForMemory`. |
| `src/errors.ts` | `CryptoError` base (`code`) + subclasses + `ERROR_MESSAGES`. |
| `src/types.ts` | Option / header / callback shapes. |

Both `header.ts` and `stream-cipher.ts` import `xchacha20poly1305 as gcm` — the
`gcm` alias is **legacy/misleading**: the primitive is XChaCha20-Poly1305, not
AES-GCM (see §6.4). `CONFIG.SIZES.NONCE = 12` with the comment "for GCM" is dead
history — the actual XChaCha nonce is 24 bytes, prepended automatically by
`managedNonce` and never stored in metadata.

---

## 3. The chunk pipeline

### 3.1 Encrypt (`streamEncryptWithPassword`, `src/password.ts:10`)

1. Validate `password`; compute `totalChunks = ceil(file.size / CONFIG.CHUNK.SIZE)`
   (10 MB) and `ext` from the file name (`'bin'` fallback).
2. `onStage('Generating encryption key...')`; `salt = randomBytes(16)`;
   `key = argon2id(password, salt, CONFIG.ARGON2)`.
3. `createStreamHeader` builds chunk 0 (§4) — the header JSON `{e,c}` is itself
   AEAD-encrypted under `key`. Pushed first.
4. `onStage('Encrypting file...')`; for each 10 MB slice: `readFileChunk`
   (FileReader) → `onProgress` → `await setTimeout(0)` (yield, §7) →
   `cipher.encryptChunk` → push. `encryptChunk` prepends
   `[uint32 size][32-byte sha256]` metadata to the ciphertext.
5. `cipher.destroy()` wipes the key; return
   `new Blob([header, ...chunks], { type: 'application/octet-stream' })`.
6. `finally { secureClear(key.buffer) }` — random-fill then zero (§6.3).

Public-key encrypt (`src/publickey.ts:16`) is the identical loop, differing only
in key establishment (§5.2) and an optional signature step before the header.

### 3.2 Decrypt (`streamDecryptWithPassword`, `src/password.ts:74`)

1. Read the first `CONFIG.SIZES.HEADER_MAX` (2048) bytes; assert the magic ==
   `MAGIC_BYTES.PASSWORD` (else `NOT_PASSWORD_ENCRYPTED`).
2. `parseStreamHeader` re-derives `key` from `salt + password` and AEAD-decrypts
   the header JSON to recover `c` (chunk count) and `headerLength`.
3. Walk `c` chunks from `offset = headerLength`: `readAndExtractChunk` reads the
   36-byte metadata first, then the full `36 + size` record; `decryptChunk`
   decrypts and verifies the SHA-256; advance `offset += totalSize`.
4. Reassemble `new Blob(chunks)`. Password mode returns
   `signatureValid: undefined` (signatures are a public-key concern).

Private-key decrypt (`src/publickey.ts:83`) mirrors this, but
`parseStreamHeader` ECIES-unwraps the symmetric key, and a signature (if present
and a sender public key is supplied) is verified against the whole-file hash
(§6.2).

---

## 4. Wire format

`parseStreamHeader` reads `magic(3)` + `len(2, LE)` and branches on the magic.

### 4.1 Password header (`ns1`)

```
magic 'ns1' (3B) │ totalLen uint16 LE (2B) │ salt (16B) │ AEAD(header JSON)
```

`totalLen = SALT(16) + encryptedHeader.length`. The parser slices the salt at
offset 5, derives the key via `argon2id(password, salt)`, and AEAD-decrypts the
header body. Header JSON: `{ e: ext, c: totalChunks }`.

### 4.2 Public-key header (`ns0` / signed `ns2`)

```
magic (3B) │ totalLen uint16 LE (2B) │ keyLen uint16 LE (2B) │ eciesEncryptedSymKey (keyLen) │ AEAD(header JSON)
```

`totalLen = 2 + keyLen + encryptedHeader.length`. The parser reads `keyLen`,
ECIES-decrypts the wrapped symmetric key with the receiver private key, then
AEAD-decrypts the header body under that symmetric key. Header JSON adds `s`
(the signature bytes) when the magic is `ns2`. `HeaderData = { e, c, s? }`
(`src/types.ts:1`).

### 4.3 Per-chunk record (both modes)

```
[ size uint32 LE (4B) │ sha256 (32B) ] │ XChaCha20-Poly1305 ciphertext (size bytes)
```

The 36-byte metadata (`serializeMetadata`/`deserializeMetadata`, `src/utils.ts`)
lets the decryptor read exactly how many bytes the next ciphertext is before
reading it. The 24-byte XChaCha nonce is *inside* the ciphertext (prepended by
`managedNonce`), not in the metadata — so `size` counts nonce + ciphertext + tag.

---

## 5. Key establishment modes

### 5.1 Password (Argon2id)

`key = argon2id(password, randomSalt(16), { t:3, m:1280 KiB, p:4 })`. The salt
is stored in the header (plaintext — it is not secret); the password is never
stored. Decrypt re-derives the same key from the stored salt + the supplied
password. A wrong password produces a key that fails AEAD decryption of the
header, surfacing as a `DecryptionError`.

### 5.2 Public-key (ECIES + optional signature)

1. Generate a random 32-byte `symmetricKey` (`CONFIG.SIZES.SYM_KEY`).
2. `encryptedKey = ecies.encrypt(receiverPublicKey, symmetricKey)` — the file is
   encrypted under `symmetricKey`; only the receiver's private key can unwrap it.
3. If `sender.privKeyBytes` is given: `fileHash = hashFile(file)` (streaming
   SHA-256, §7), `signature = secp256k1.sign(fileHash, sender.privKeyBytes)`, and
   the magic becomes `ns2`; the signature travels in the header JSON `s`.
4. Decrypt: `ecies.decrypt(receiverPrivateKey, encryptedKey)` recovers the
   symmetric key. If a signature and a sender public key are both present,
   `secp256k1.verify(signature, fileHash, senderPublicKey)` sets `signatureValid`.

### 5.3 Text mode

`text.ts` wraps a string in `new File([text], 'source.txt')`, runs it through the
same stream function (password if a password is given, else public-key), and
returns `{ blob, base64 }` where `base64` is `magic + base64(ciphertext)`.
`decryptText` strips the 3-char prefix, base64-decodes into a `File`, decrypts,
and returns `{ text, signatureValid }`. **Dead params:** `decryptText` forwards
`receiver`/`sender` into `streamDecryptWithPassword`, which ignores them
(`StreamDecryptOptions` accepts them but password decrypt never reads them) —
harmless, but do not rely on them in password mode.

---

## 6. Integrity, signatures & key hygiene

### 6.1 Per-chunk integrity (`StreamCipher`)

`encryptChunk` computes `sha256(plaintextChunk)` and stores it in the 36-byte
metadata; `decryptChunk` recomputes `sha256` over the decrypted chunk and
compares against the stored hash with `compareArrays` — a **constant-time**
XOR-accumulate (no early return), so a mismatch (`CHUNK_INTEGRITY_FAILED`) does
not leak position via timing. This is layered on top of the AEAD tag, which
already authenticates each chunk.

### 6.2 Signatures are non-fatal

`streamDecryptWithPrivateKey` verifies the sender signature (over the whole-file
hash) only when both a signature and a sender public key are present. A failed
verification **only fires an `onStage(SIGNATURE_VERIFY_FAILED)` message and sets
`signatureValid = false` — it does not throw, and decryption proceeds**
(`src/publickey.ts:125`). Callers that require authenticity must inspect the
returned `signatureValid` flag and reject on `false`.

### 6.3 Key wiping (`secureClear`)

Every symmetric/derived key is wiped in a `finally` block and by
`StreamCipher.destroy()`. `secureClear` (`src/utils.ts:7`) random-fills the
buffer (`getRandomValues`) *then* zeroes it, so the key does not linger in memory
after the operation.

### 6.4 ECIES buffer-pool hazard

`parseStreamHeader` copies `ecies.decrypt`'s output into a freshly owned
`Uint8Array` before use (`src/header.ts:139`). `ecies.decrypt` returns a slice
of Node's shared `Buffer` pool; running `secureClear` on that raw `.buffer`
would scribble over unrelated allocations. The copy makes the key safe to wipe.

---

## 7. Memory & responsiveness

- **Cooperative yielding.** `await new Promise(r => setTimeout(r, 0))` between
  chunks (`password.ts:54,60`, `publickey.ts:71`) hands control back to the event
  loop so the UI/worker stays responsive during a large-file operation.
- **Streaming file hash.** `hashFile` (`src/utils.ts:93`) folds the file into a
  SHA-256 in 10 MB windows so signing/verifying never loads the whole file.
- **Memory backpressure.** `waitForMemory` (`src/utils.ts:20`) polls
  `performance.memory.usedJSHeapSize` against `CONFIG.CHUNK.MAX_MEMORY` (100 MB)
  and, if over, calls `global.gc()` when exposed and re-checks after 100 ms. This
  is best-effort: `performance.memory` and `gc` exist only in Chromium / flagged
  Node — elsewhere `getMemoryUsage()` returns 0 and it is a no-op.

---

## 8. The format contract

The values in `src/constants.ts` are the **binary contract**, not tunables:

| Group | Values |
| --- | --- |
| `CONFIG.CHUNK` | `SIZE=10MB`, `BUFFER=20MB`, `MAX_MEMORY=100MB` |
| `CONFIG.ARGON2` | `t=3`, `m=1280` (KiB), `p=4`, `maxmem=2^32-1` |
| `CONFIG.SIZES` | `SALT=16`, `NONCE=12`, `SYM_KEY=32`, `SIGNATURE=64`, `HEADER_MAX=2048` |
| `MAGIC_BYTES` | `PASSWORD='ns1'`, `PUBLIC_KEY='ns0'`, `SIGNED='ns2'` |

Changing `CHUNK.SIZE` re-chunks the stream; changing any `ARGON2` param changes
the derived key for the same password; changing `SALT`/offsets shifts every field
in the header. **Any of these makes existing ciphertexts undecryptable.** There
is no in-band version negotiation, so evolving the format means introducing a new
magic byte (e.g. `ns3`) and a parallel decode path — keeping the old path for
backward compatibility — never editing a constant in place. `HEADER_MAX=2048`
bounds how many leading bytes decrypt reads to find the header; the public-key
header (wrapped key + AEAD body) must fit within it.

---

## 9. Errors & detection

### 9.1 Error hierarchy (`src/errors.ts`)

`CryptoError extends Error` carries a `code`; subclasses fix the code:
`InvalidDataError` (`INVALID_DATA`), `DecryptionError` (`DECRYPTION_FAILED`),
`EncryptionError` (`ENCRYPTION_FAILED`). `ERROR_MESSAGES` is the canonical string
map (e.g. `PASSWORD_REQUIRED`, `NOT_PASSWORD_ENCRYPTED`, `CHUNK_INTEGRITY_FAILED`,
`SIGNATURE_VERIFY_FAILED`). Header/chunk operations wrap the underlying primitive
error's message into the appropriate typed error.

### 9.2 Detection (`src/detect.ts`)

`detect(fileOrBase64)` reads the first 3 bytes (a base64 string prefix, or a
`FileReader` slice of a `File`) and maps the magic to
`'pwd' | 'pubk' | 'signed'`, defaulting to `'unencrypted'` for anything else (and
on any read error). It also reports `isText` (whether the input was a string).
Use it to route to the correct decrypt function before prompting for a password
or key.

---

## 10. Build, test & consumption

### 10.1 Build

`tsdown` (`tsdown.config.ts`): `entry: ['src/index.ts']`, `format: ['esm','cjs']`,
`dts: true`, `clean` unless `--watch`. Output: `dist/index.mjs` / `.cjs` /
`.d.mts`, wired through `package.json` `exports`.

| Script | Command | Purpose |
| --- | --- | --- |
| `build` | `tsdown` | Emit `dist/` (ESM + CJS + types). |
| `dev` | `tsdown --watch` | Rebuild on change. |
| `test` | `vitest --run` | One-shot tests (happy-dom). |
| `test:watch` | `vitest` | Watch mode. |
| `typecheck` | `tsc --noEmit` | Type-only check (`@cdlab/tsconfig/utils.json`). |
| `prepack` | `pnpm build` | Ensure `dist/` before packaging. |

Run any of them as `pnpm --filter @cdlab/cipher <script>`.

### 10.2 Tests

`vitest` under `happy-dom` (`vitest.config.ts`) for `File`/`Blob`/`FileReader`.
One `test/*.test.ts` per source module (`constants`, `detect`, `errors`, `header`,
`password`, `publickey`, `stream-cipher`, `text`, `utils`). `test/polyfill.ts`
sets `globalThis.crypto` to Node's webcrypto for the test env; it is **not**
registered as a global vitest `setupFile`, so individual test files import it
where needed.

### 10.3 Consumption

There is no deploy — the package is consumed via `"@cdlab/cipher": "workspace:*"`
by `dropply-web` (in a Web Worker). Consumers resolve `dist/`, so
after editing source you must rebuild (`build`, `dev --watch`, or the repo-root
`pnpm prepare`, which builds workspace packages in topological order) or the
consumer will not see new exports. All primitive versions come from the pnpm
`prod` catalog (`pnpm-workspace.yaml`); `@libsql`-style externalization does not
apply here — the noble/eciesjs deps are bundled normally.
