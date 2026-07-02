# Dropply

[English](./README.md) | [中文](./README.zh-CN.md)

End-to-end encrypted file and text sharing — encryption happens client-side and the 256-bit key travels only in the URL fragment (`#key=...`), so the server ([`dropply-api`](../dropply-api)) never sees plaintext. Built with **Next.js (App Router)** and deployed to **Cloudflare Pages**.

Preview: https://dropply.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/og-image.png)

## Features

- **Client-side encryption** (`src/lib/crypto.ts`)
  - Files and text are encrypted with AES-GCM, key derived via Argon2id (`@cdlab996/cipher`), before anything leaves the browser
  - A 256-bit key is auto-generated (`generateEncryptionKey`) and shared only via the URL fragment (`#key=...`) — never sent to the server; can be customized or regenerated at any time

- **Share** (`src/lib/api.ts` — `PocketChestAPI`)
  - Upload files (drag-and-drop) and text snippets together in one share
  - Small files (≤ 20 MB): concurrent upload, up to 3 parallel requests
  - Large files (> 20 MB): chunked multipart upload — 20 MB chunks, up to 3 concurrent parts, per-part retry
  - Configurable expiry: 1 day / N days / 1 week / 1 month / 1 year
  - Optional TOTP authentication gate (server-configured) before sharing unlocks
  - Share via link, or send the retrieval code directly by email

- **Retrieve**
  - 6-character retrieval code auto-filled from the URL query (`?code=`)
  - Encryption key auto-filled from the URL fragment (`#key=...`) or entered manually
  - Download files individually or as a ZIP archive; text items decrypted and shown inline

- **Internationalization** — English and Chinese (`next-intl`)

- **Other** — dark / light theme, responsive design

## Tech Stack

- **Framework** — Next.js (App Router), React, TypeScript
- **Encryption** — `@cdlab996/cipher` (AES-GCM + Argon2id, ECIES), `@cdlab996/uncrypto` (cross-runtime crypto shim)
- **UI** — `@cdlab996/ui` (shadcn + Tailwind v4), `react-dropzone`, `sonner`
- **State** — Zustand (`useShareStore`, `useRetrieveStore`, `useAuthStore`)
- **i18n** — next-intl (en / zh)
- **Platform** — Cloudflare Pages via `@cloudflare/next-on-pages`

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A running instance of [`dropply-api`](../dropply-api) (local or deployed)

### Install

```bash
pnpm install
```

### Configure environment

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://localhost:3014` | Base URL of the `dropply-api` backend |

### Development

```bash
pnpm --filter @cdlab996/dropply-web dev
```

Dev server runs at `http://dropply-web.localhost:3355` via `@dotns/nsl`.

### Build / Deploy

```bash
# Next.js production build
pnpm --filter @cdlab996/dropply-web build

# Build for Cloudflare Pages
pnpm --filter @cdlab996/dropply-web build:cf
```

## Architecture

Dropply is split into two apps that must be deployed together: this frontend (`dropply-web`) and [`dropply-api`](../dropply-api), an end-to-end encrypted file sharing API. The server only ever stores ciphertext and metadata — it never has the decryption key.

| Path | Responsibility |
|---|---|
| `src/lib/crypto.ts` | Key generation, URL-fragment encode/decode, file and text encrypt/decrypt (wraps `@cdlab996/cipher`) |
| `src/lib/api.ts` | `PocketChestAPI` — talks to `dropply-api`: config, chest creation, regular + multipart upload, retrieval, download, email share |
| `src/store/useShareStore.ts` | Share-tab state (files, text items, expiry, upload progress) |
| `src/store/useRetrieveStore.ts` | Retrieve-tab state (retrieval code, key, downloaded content) |
| `src/store/useAuthStore.ts` | Session-scoped TOTP token, persisted to `sessionStorage` |
| `src/components/share/`, `src/components/retrieve/` | Share and Retrieve tab UI |
| `src/app/[locale]/` | Locale-aware App Router pages |

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
