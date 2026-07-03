# SecureC

[English](./README.md) | [中文](./README.zh-CN.md)

Client-side file and text encryption — nothing ever leaves the browser. All crypto runs in a **Web Worker** on top of `@cdlab996/cipher` (XChaCha20-Poly1305 + Argon2id, with optional ECIES public-key mode), so the UI thread stays responsive even on large files.

Preview: https://securec.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/og-image.png)

## Features

- **Password mode** — derive a key from a password with Argon2id (random salt per operation) and encrypt with XChaCha20-Poly1305
- **Public-key mode (ECIES)** — encrypt to a recipient's public key, with optional digital signatures for authentication
- **File and text encryption** — encrypt/decrypt any file type or a plain-text message; text output is Base64
- **Large-file streaming** — files are processed in 10MB chunks (`streamCrypto.encrypt/decrypt.withPassword`) to keep memory usage flat regardless of file size
- **Auto mode-detect on decrypt** — reads the cipher stream header (magic bytes) to detect an encrypted file, and does the same for pasted encrypted text, switching the UI to decrypt mode automatically
- **Web Worker execution** (`src/workers/cryptoWorker.ts`) — encryption/decryption never blocks the main thread; progress is streamed back via `postMessage`
- **Multi-file batch processing** — queue multiple files with per-file progress, add/remove files incrementally
- **Processing history** — every operation is tracked with persistent storage: metadata in `localStorage`, binary data in **IndexedDB** (`src/lib/storage.ts`, via `@cdlab996/utils`'s `createIDBStore`); batch download/delete from history
- **Internationalization** — English and Chinese via `next-intl`

## Tech Stack

- **Framework** — Next.js (App Router), React, TypeScript
- **Encryption** — `@cdlab996/cipher` (XChaCha20-Poly1305, Argon2id, ECIES), run inside a Web Worker
- **State** — Zustand (`src/store/useProcessStore.ts`), persisted via `zustand/middleware`
- **Storage** — IndexedDB (`@cdlab996/utils` `createIDBStore`) for binary payloads, `localStorage` for result metadata
- **UI** — `@cdlab996/ui` (shadcn/ui primitives), Tailwind v4, Sonner for toasts
- **i18n** — next-intl (en / zh)

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10

### Install

```bash
# From the monorepo root
pnpm install
```

### Development

```bash
pnpm --filter @cdlab996/securec dev
```

Dev server runs at `http://securec.localhost:3355` (via `@dotns/nsl`).

### Generate ECIES key pairs

```bash
pnpm --filter @cdlab996/securec gk
```

Runs `scripts/generateKeys.js` — derives BIP32 key pairs from mnemonics (`@scure/bip32` / `@scure/bip39`) and demonstrates an ECIES encrypt/decrypt round trip between two parties, printing the public keys to the console.

### Build / Deploy

```bash
pnpm --filter @cdlab996/securec build      # next build
pnpm --filter @cdlab996/securec build:cf   # @cloudflare/next-on-pages
```

## License

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
