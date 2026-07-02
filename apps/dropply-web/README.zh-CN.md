# Dropply

[English](./README.md) | [中文](./README.zh-CN.md)

端到端加密的文件与文本分享工具——加密在客户端完成，256 位密钥仅通过 URL fragment（`#key=...`）传递，服务端（[`dropply-api`](../dropply-api)）从不接触明文。基于 **Next.js (App Router)** 构建，部署于 **Cloudflare Pages**。

预览：https://dropply.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/og-image.png)

## 功能特性

- **客户端加密**（`src/lib/crypto.ts`）
  - 文件和文本在离开浏览器前即完成 AES-GCM 加密，密钥经 Argon2id 派生（`@cdlab996/cipher`）
  - 256 位密钥自动生成（`generateEncryptionKey`），仅通过 URL fragment（`#key=...`）传递——从不发送至服务端；可随时自定义或重新生成

- **分享**（`src/lib/api.ts` — `PocketChestAPI`）
  - 支持拖拽上传文件，可同时分享文件和文本片段
  - 小文件（≤ 20 MB）：并发上传，最多 3 个并行请求
  - 大文件（> 20 MB）：分块 Multipart 上传——每块 20 MB，最多 3 个并发分块，支持单分块重试
  - 可配置有效期：1 天 / N 天 / 1 周 / 1 个月 / 1 年
  - 可选 TOTP 验证门控（由服务端配置），通过后方可解锁分享
  - 支持通过链接分享，或直接将取件码发送至对方邮箱

- **取件**
  - 6 位取件码可从 URL 参数（`?code=`）自动填充
  - 加密密钥可从 URL fragment（`#key=...`）自动填充，也可手动输入
  - 支持单个文件下载或打包为 ZIP 一键下载；文本内容解密后直接内联展示

- **国际化** — 支持中文和英文（`next-intl`）

- **其他** — 深色 / 浅色主题，响应式设计

## 技术栈

- **框架** — Next.js (App Router)、React、TypeScript
- **加密** — `@cdlab996/cipher`（AES-GCM + Argon2id，ECIES）、`@cdlab996/uncrypto`（跨运行时加密垫片）
- **UI** — `@cdlab996/ui`（shadcn + Tailwind v4）、`react-dropzone`、`sonner`
- **状态管理** — Zustand（`useShareStore`、`useRetrieveStore`、`useAuthStore`）
- **国际化** — next-intl（en / zh）
- **部署平台** — Cloudflare Pages，经由 `@cloudflare/next-on-pages`

## 快速开始

### 前置条件

- Node.js 20+
- pnpm
- 一个可用的 [`dropply-api`](../dropply-api) 实例（本地或已部署）

### 安装

```bash
pnpm install
```

### 配置环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://localhost:3014` | `dropply-api` 后端的基础 URL |

### 开发

```bash
pnpm --filter @cdlab996/dropply-web dev
```

开发服务器通过 `@dotns/nsl` 运行在 `http://dropply-web.localhost:3355`。

### 构建 / 部署

```bash
# Next.js 生产构建
pnpm --filter @cdlab996/dropply-web build

# 构建 Cloudflare Pages 版本
pnpm --filter @cdlab996/dropply-web build:cf
```

## 架构

Dropply 由两个必须配套部署的应用组成：本前端（`dropply-web`）与 [`dropply-api`](../dropply-api)——一个端到端加密文件分享 API。服务端只存储密文和元数据，从不掌握解密密钥。

| 路径 | 职责 |
|---|---|
| `src/lib/crypto.ts` | 密钥生成、URL fragment 编解码、文件与文本的加解密（封装 `@cdlab996/cipher`） |
| `src/lib/api.ts` | `PocketChestAPI` — 与 `dropply-api` 通信：配置获取、创建分享、常规/分块上传、取件、下载、邮件分享 |
| `src/store/useShareStore.ts` | 分享标签页状态（文件、文本片段、有效期、上传进度） |
| `src/store/useRetrieveStore.ts` | 取件标签页状态（取件码、密钥、已下载内容） |
| `src/store/useAuthStore.ts` | 会话级 TOTP 令牌，持久化于 `sessionStorage` |
| `src/components/share/`、`src/components/retrieve/` | 分享与取件标签页 UI |
| `src/app/[locale]/` | 语言感知的 App Router 页面 |

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
