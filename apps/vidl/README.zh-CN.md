# Video Downloader

[English](./README.md) | [中文](./README.zh-CN.md)

纯浏览器端视频下载工具 —— 解析 M3U8/HLS 播放列表和直链视频，解密与转封装全部在浏览器内完成，通过 Streams API 实现近零内存占用。无需上传，无服务端处理。

预览：https://vidl.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/vidl/og-image.png)

## 功能特性

- **多格式支持**
  - M3U8/HLS 播放列表解析（`src/lib/m3u8-parser.ts`），支持按带宽/分辨率选择主播放列表中的变体流
  - 直接下载 MP4、WebM、MKV、AVI、MOV、FLV、WMV、MPEG、TS（见 `src/lib/video-utils.ts` 中的 `VIDEO_MIME_MAP`）
  - 自动检测 URL 格式，无需手动切换

- **单个 & 批量下载**
  - 单个模式：粘贴一个链接，解析、配置、下载
  - 批量模式（`src/lib/batch-utils.ts`）：一次粘贴多个链接，自动解析全部，逐项配置画质/格式/分片范围/文件名，顺序下载并逐项处理错误

- **范围下载** —— 通过滑块自定义分片范围，并基于采样估算文件大小（`estimateFileSize`）

- **流式下载（推荐大文件使用）** —— 近零内存占用，通过浏览器 Streams API 边下载边写入磁盘；在不支持的环境（Safari）自动回退为普通（内存）下载

- **容错能力** —— 暂停/恢复、单分片重试，并发下载数可配置，配合指数退避重试（`src/lib/download-engine.ts` 中的 `downloadTS` worker 池）

- **AES-128 解密**（`src/lib/aes-decryptor.ts`）—— 自动检测 `#EXT-X-KEY`，获取密钥并在转封装前解密每个分片

- **TS → MP4 转封装** —— 通过 `mux.js` 将下载的 `.ts` 分片转封装为 MP4，全程浏览器端完成，包含音视频轨道合并与时间戳同步

- **跨工具联动** —— 一键跳转到 [byplay](https://byplay.pages.dev/) 预览播放当前视频，并保持当前语言设置

- **用户体验** —— 带重试功能的分片状态网格、国际化（中文 / 英文）、深色 / 浅色主题、响应式布局

## 技术栈

- **框架** —— Next.js（App Router）、React、TypeScript
- **下载管道** —— `mux.js`（TS → MP4 转封装）+ 浏览器 Streams API（`WritableStream`，通过内置的 `StreamSaver.js`）实现近零内存写入
- **状态管理** —— Zustand（`src/stores/`）
- **国际化** —— next-intl（en / zh）
- **UI** —— `@cdlab/ui`（Tailwind v4、shadcn/ui 组件）

## 快速开始

### 前置条件

- Node.js 与 `pnpm`（版本参见仓库根目录）

### 安装

```bash
# 在 monorepo 根目录执行
pnpm install
```

### 开发

```bash
pnpm --filter @cdlab/vidl dev
```

开发地址：`http://vidl.localhost:3355`（通过 `@dotns/nsl`，无需手动查找端口）。

### 构建 / 部署

```bash
pnpm --filter @cdlab/vidl build     # next build
pnpm --filter @cdlab/vidl build:cf  # @cloudflare/next-on-pages
```

## 架构

| 路径 | 职责 |
| --- | --- |
| `src/lib/download-engine.ts` | `DownloadEngine` 类 —— 编排解析/下载/暂停/重试/取消流程；对分片运行并发 worker 池，支持单次尝试超时和指数退避重试；同时驱动内存模式和流写入模式的完成检测 |
| `src/lib/m3u8-parser.ts` | 判断主播放列表与媒体播放列表，解析 `#EXT-X-STREAM-INF` 变体流（带宽、分辨率、名称） |
| `src/lib/aes-decryptor.ts` | `AESDecryptor` —— 独立实现的 AES-128-CBC（密钥扩展 + 分组解密 + PKCS7 去填充），用于解密 HLS 分片 |
| `src/lib/video-utils.ts` | 共享类型、URL 解析（`applyURL`）、MIME 映射、`fetchData`/`estimateFileSize`，以及 `triggerBrowserDownload`（内存模式下的 Blob 组装） |
| `src/lib/batch-utils.ts` | `fetchUrlMetadata` —— 将一个 URL（直链视频 / 主播放列表 / 媒体播放列表）解析为分片数和预估大小，供批量模式队列使用 |
| `src/stores/` | Zustand 状态：`download-store`（单个下载状态）、`batch-store`（批量队列）、`settings-store`（并发数/超时/重试，持久化到 `localStorage`） |

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
