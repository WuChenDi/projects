# Dropply

[English](./README.md) | [中文](./README.zh-CN.md)

基于 Next.js 构建、部署于 Cloudflare Pages 的端到端加密文件与文本分享平台。

预览：https://dropply.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/og-image.png)

## 功能特性

- **端到端加密**
  - 文件和文本在上传前于客户端完成加密，采用 AES-GCM 算法 + Argon2id 密钥派生
  - 256 位密钥自动生成，仅通过 URL fragment（`#key=...`）传递，服务端从不接触明文
  - 加密密钥可随时自定义或重新生成

- **分享**
  - 支持拖拽上传文件和文本片段，可同时分享多种内容
  - 小文件（≤ 20 MB）：最多 3 个并发请求同时上传
  - 大文件（> 20 MB）：分块 Multipart 上传（20 MB 每块，最多 3 个并发分块）
  - 可配置有效期：1 天 / N 天 / 1 周 / 1 个月 / 1 年
  - 可选 TOTP 验证门控（由服务端配置），通过后方可使用分享功能
  - 支持通过链接分享，或直接将取件码发送至对方邮箱

- **取件**
  - 6 位取件码可从 URL 参数（`?code=`）自动填充
  - 加密密钥可从 URL fragment（`#key=...`）自动填充，也可手动输入
  - 支持单个文件下载或打包为 ZIP 一键下载
  - 文本内容解密后直接展示在页面上

- **国际化**
  - 支持中文和英文（基于 `next-intl`）

- **其他**
  - 深色 / 浅色主题切换
  - 响应式设计

## 快速开始

```bash
# 安装依赖（在 monorepo 根目录执行）
pnpm install

# 启动开发服务器 http://localhost:3013
pnpm --filter dropply-web dev

# 构建
pnpm --filter dropply-web run build

# 构建（Cloudflare Pages）
pnpm --filter dropply-web run build:cf
```

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://localhost:3014` | 后端 API 地址（`dropply-api`） |

## 📜 许可证

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
