# SecureC

[English](./README.md) | [中文](./README.zh-CN.md)

纯客户端的文件与文本加密工具——数据永远不会离开浏览器。所有加解密都运行在 **Web Worker** 中，基于 `@cdlab996/cipher`（XChaCha20-Poly1305 + Argon2id，可选 ECIES 公钥模式），因此处理大文件时 UI 线程始终保持响应。

预览：https://securec.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/og-image.png)

## Features

- **密码模式** — 使用 Argon2id（每次操作随机盐）从密码派生密钥，并用 XChaCha20-Poly1305 加密
- **公钥模式（ECIES）** — 使用接收方公钥加密，可选数字签名进行身份验证
- **文件与文本加密** — 加解密任意文件类型或纯文本消息；文本输出为 Base64
- **大文件流式处理** — 文件以 10MB 为单位分块处理（`streamCrypto.encrypt/decrypt.withPassword`），无论文件多大都能保持内存占用平稳
- **解密时自动检测模式** — 通过读取加密流的 header（magic bytes）检测已加密文件，粘贴的加密文本同样支持自动检测，并自动切换到解密模式
- **Web Worker 执行**（`src/workers/cryptoWorker.ts`） — 加解密不会阻塞主线程，进度通过 `postMessage` 实时回传
- **多文件批量处理** — 可排队处理多个文件，每个文件独立显示进度，支持增量添加/移除
- **处理历史** — 每次操作都会被追踪并持久化存储：元数据存于 `localStorage`，二进制数据存于 **IndexedDB**（`src/lib/storage.ts`，基于 `@cdlab996/utils` 的 `createIDBStore`）；支持在历史记录中批量下载/删除
- **国际化** — 通过 next-intl 支持中英文

## Tech Stack

- **Framework** — Next.js (App Router)、React、TypeScript
- **加密** — `@cdlab996/cipher`（XChaCha20-Poly1305、Argon2id、ECIES），在 Web Worker 中运行
- **状态管理** — Zustand（`src/store/useProcessStore.ts`），通过 `zustand/middleware` 持久化
- **存储** — IndexedDB（`@cdlab996/utils` 的 `createIDBStore`）存储二进制数据，`localStorage` 存储结果元数据
- **UI** — `@cdlab996/ui`（shadcn/ui 组件）、Tailwind v4、Sonner 通知组件
- **i18n** — next-intl（en / zh）

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10

### Install

```bash
# 在 monorepo 根目录执行
pnpm install
```

### Development

```bash
pnpm --filter @cdlab996/securec dev
```

开发服务器运行于 `http://securec.localhost:3355`（通过 `@dotns/nsl`）。

### 生成 ECIES 密钥对

```bash
pnpm --filter @cdlab996/securec gk
```

运行 `scripts/generateKeys.js`——通过助记词派生 BIP32 密钥对（`@scure/bip32` / `@scure/bip39`），并演示两方之间的 ECIES 加解密流程，将公钥打印到控制台。

### Build / Deploy

```bash
pnpm --filter @cdlab996/securec build      # next build
pnpm --filter @cdlab996/securec build:cf   # @cloudflare/next-on-pages
```

## License

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
