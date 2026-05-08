# Dropply

[English](./README.md) | [中文](./README.zh-CN.md)

Secure file and text sharing platform with end-to-end encryption, built with Next.js and deployed on Cloudflare Pages.

Preview: https://dropply.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/og-image.png)

## Features

- **End-to-end Encryption**
  - Files and text are encrypted client-side before upload using AES-GCM with Argon2id key derivation
  - A 256-bit key is auto-generated and shared only via the URL fragment (`#key=...`) — the server never sees plaintext
  - Encryption key can be customized or regenerated at any time

- **Share**
  - Upload files (drag-and-drop) and text snippets together in one share
  - Small files (≤ 20 MB): concurrent upload with up to 3 parallel requests
  - Large files (> 20 MB): chunked multipart upload (20 MB chunks, up to 3 concurrent parts)
  - Configurable expiry: 1 day / N days / 1 week / 1 month / 1 year
  - Optional TOTP authentication gate (server-configured) before sharing is unlocked
  - Share via link or send the retrieval code directly by email

- **Retrieve**
  - 6-character retrieval code auto-filled from URL query param (`?code=`)
  - Encryption key auto-filled from URL fragment (`#key=...`) or entered manually
  - Download files individually or as a ZIP archive
  - Text items decrypted and displayed inline

- **Internationalization**
  - English and Chinese (`next-intl`)

- **Other**
  - Dark / light theme
  - Responsive design

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start dev server on http://localhost:3013
pnpm --filter dropply-web dev

# Build
pnpm --filter dropply-web run build

# Build for Cloudflare Pages
pnpm --filter dropply-web run build:cf
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://localhost:3014` | Backend API base URL (`dropply-api`) |

## License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
