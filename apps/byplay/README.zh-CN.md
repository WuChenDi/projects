# byplay

[English](./README.md) | [中文](./README.zh-CN.md)

用于测试和调优 HLS 流的在线视频播放器——加载一个 M3U8 或直链视频，实时调整 ABR、缓冲区、重试策略，并观察统计数据变化。基于 **Next.js (App Router)** 和 **hls.js** 构建，所有播放均在客户端完成。

> 所有视频处理均在浏览器本地完成，不会上传任何数据到服务器。

Preview: https://byplay.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png)

## 功能特性

- **多格式播放**
  - 通过 hls.js 播放 HLS/M3U8，支持自适应码率（ABR）
  - 直接播放 MP4、WebM、OGG、MOV、MKV 等格式
  - 自动检测格式——非 HLS 视频时自动隐藏 HLS 配置面板

- **HLS 控制**
  - 手动切换画质等级或启用自动 ABR
  - 可配置缓冲区、ABR、性能及重试/加载超时参数
  - 实时统计：带宽、已缓冲时长、丢帧数、当前等级

- **广告过滤**
  - 基于 M3U8 manifest/level 加载器钩子的分片剔除
  - 四种过滤模式：关闭 / 关键字 / 启发式 / 激进
  - 自定义关键字列表

- **通用播放**
  - 可调节播放速度（0.25x – 4x）
  - 自动播放开关
  - 事件日志，便于调试

- **跨工具集成**
  - 一键跳转到 [vidl](https://vidl.pages.dev/) 下载当前视频
  - 切换页面时保留语言设置（中/英）
  - 播放事件上报至 `byplay-log` worker（端点可配置）

## 技术栈

- **框架** — Next.js (App Router)、React、TypeScript
- **播放** — hls.js（HLS/M3U8 ABR 引擎）、原生 `<video>` 用于直链格式
- **国际化** — next-intl（en / zh）

## 快速开始

### 环境要求

- Node.js 与 pnpm（参见 monorepo 根目录 `package.json`）

### 安装

```bash
pnpm install
```

### 本地开发

```bash
pnpm --filter @cdlab996/byplay dev
```

通过 `@dotns/nsl` 运行在 `http://byplay.localhost:3355`。

### 构建 / 部署

```bash
pnpm --filter @cdlab996/byplay build     # next build
pnpm --filter @cdlab996/byplay build:cf  # @cloudflare/next-on-pages
```

通过 `@cloudflare/next-on-pages` 部署为 Cloudflare Pages 上的 Next.js 应用。

## 架构

| 路径 | 作用 |
|---|---|
| `src/hooks/use-hls-player.ts` | hls.js 封装——管理 `HlsConfig`、播放状态、画质切换、广告过滤钩子及事件日志 |
| `src/components/player/source-card.tsx` | URL 输入、剪贴板粘贴、跳转到 vidl 的操作 |
| `src/components/player/abr-card.tsx` | 自适应码率调优（带宽估算、上下调节因子） |
| `src/components/player/buffer-card.tsx` | 缓冲区长度/大小配置 |
| `src/components/player/loading-retry-card.tsx` | 分片/manifest/等级加载超时及重试行为 |
| `src/components/player/ad-filter-card.tsx` | 广告过滤模式及关键字列表 |
| `src/components/player/playback-card.tsx` | 播放速度、画质等级选择、配置重置 |
| `src/components/player/stats-card.tsx` | 实时带宽/缓冲/丢帧统计 |
| `src/components/player/event-logs-card.tsx` | 可折叠的 hls.js 事件日志 |

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
