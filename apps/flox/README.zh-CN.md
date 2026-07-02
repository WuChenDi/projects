# Flox

[English](./README.md) | [中文](./README.zh-CN.md)

同时搜索数十个中文视频源，每个源一返回结果就立即展示，无需等待最慢的源——无需等待所有源全部完成。基于 **Next.js 16（App Router）+ React 19** 构建，通过 SSE 流式传输，并通过自研 HLS 播放引擎播放，内置多层广告过滤。

预览：https://floxx.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flox/og-image.png)

## 功能特性

- **多源并行搜索** —— `POST /api/search-parallel` 并行请求所有已启用的源，通过 SSE 在每个源返回结果时立即流式回传，而不是等待最慢的源
  - 一键导入的精选源列表（38+ 条），支持用户自定义添加源，拖拽排序、启用/禁用、导入导出
  - 记录并展示每个源的响应延迟
- **自研 HLS 播放器** —— 支持按用户切换的双播放引擎：火山引擎 VePlayer，或完全自研的基于 hls.js 的引擎（`VideoPlayer` → `CustomVideoPlayer` → `DesktopVideoPlayer`，配有独立控制层）
  - 多层 M3U8 广告过滤 —— 关键词、启发式（block 评分）、激进模式，以及 SCTE-35 `#EXT-X-CUE-OUT/IN` 检测
  - 片头/片尾自动跳过、自动下一集、卡顿检测、播放进度续播
- **视频代理** —— `GET /api/proxy` 在边缘转发上游视频/清单响应并附加 CORS 头，仅转发 `cookie`/`range` 头，并重写 M3U8 分片 URL 使其经由代理访问
- **收藏与历史** —— 持久化收藏、稍后观看队列、有上限的观看历史（含续播位置），均基于 `localStorage` 存储
- **密码保护** —— 本地或环境变量驱动的密码保护，支持 session 持久化，且与备份/导出流程隔离，导出的设置文件无法被重放以绕过密码门控
- **高级模式** —— 独立的路由、源、历史与收藏，与标准内容完全隔离
- **响应式设计** —— 移动端优化播放器，支持触控手势与横竖屏切换
- **主题系统** —— 亮色 / 暗色 / 跟随系统，基于 View Transition API
- **Service Worker 缓存** —— M3U8 清单与视频分片缓存

## 技术栈

- **框架** —— Next.js 16（App Router，Edge Runtime API 路由）、React 19、TypeScript
- **样式** —— Tailwind CSS 4、`@cdlab996/ui`
- **状态管理** —— Zustand 5（localStorage 持久化）、TanStack Query（搜索 mutation 与流式处理）
- **播放** —— hls.js（自研引擎）+ 火山引擎 VePlayer，`@dnd-kit` 用于源拖拽排序
- **部署** —— Cloudflare Pages，通过 `@cloudflare/next-on-pages`

## 快速开始

### 前置条件

- Node.js + pnpm（由仓库根目录统一管理）

### 安装

```bash
pnpm install
```

### 开发

```bash
pnpm --filter @cdlab996/flox dev
# 或在仓库根目录执行
pnpm dev:flox
```

开发服务器通过 `@dotns/nsl` 可在 `http://flox.localhost:3355` 访问——无需手动寻找端口。

### 构建 / 部署

`flox` 使用 **`next build --webpack`**（`build` 脚本）构建——此处不使用 Turbopack。Cloudflare Pages 部署通过 `@cloudflare/next-on-pages` 完成：

```bash
pnpm --filter @cdlab996/flox build       # next build --webpack
pnpm --filter @cdlab996/flox build:cf    # npx @cloudflare/next-on-pages@latest
```

## 架构

| 区域 | 路径 | 说明 |
|---|---|---|
| 并行搜索 | `src/app/api/search-parallel/route.ts` | Edge runtime。从请求体读取 `{ query, sources, page }`，通过 `Promise.all` 对每个源发起一次请求，并在每个源完成或失败时流式发送 SSE 帧（`type: 'start' \| 'videos' \| 'progress' \| 'complete' \| 'error'`） |
| 搜索订阅方 | `src/lib/hooks/useParallelSearch.ts` | 通过 TanStack `useMutation` 读取 SSE 流，使用 `binaryInsertVideos` 合并新到的视频，跟踪各源的数量/延迟，完成后排序并回调写入缓存 |
| 视频代理 | `src/app/api/proxy/route.ts` | Edge runtime。转发 `cookie`/`range` 头，通过 content-type 或内容探测识别 M3U8，经 `processM3u8Content` 重写清单 URL，并为所有响应附加 CORS 头 |
| 分辨率探测 | `src/app/api/probe-resolution/route.ts` | Edge runtime；服务端探测视频流分辨率 |
| 播放器外壳 | `src/components/player/VideoPlayer.tsx` | 根据 `playerEngine` 设置分发至 `FloxPlayer`（火山引擎 VePlayer）或 `CustomVideoPlayer` |
| 自研播放器链路 | `CustomVideoPlayer` → `DesktopVideoPlayer` → `desktop/*` | 设备分发 → 编排层 → 控制层组件（`DesktopControls`、`DesktopProgressBar`、`DesktopVolumeControl` 等） |
| 播放器状态 | `hooks/useDesktopPlayerState.ts` + `hooks/useDesktopPlayerLogic.ts` | `refs`/`data`/`actions` 容器，串联 `hooks/desktop/` 下的各领域 hook（播放、音量、进度、跳过、全屏、控制层显隐、快捷键） |
| HLS 引擎 | `hooks/useHlsPlayer.ts` | 负责 hls.js：HEVC/H.264 档位锁定、iOS 端基于 blob 的广告过滤及回退、不支持环境下的直连转代理回退 |
| 广告过滤 | `lib/utils/m3u8-utils.ts` | 启发式 block 评分、关键词匹配、SCTE-35 CUE 标签状态机、激进模式下的 `DISCONTINUITY` 剥离 |
| 源注册表 | `src/lib/api/{client,search-api,detail-api,default-sources,premium-sources,builtin-sources}.ts` | `client.ts` 重新导出 `searchVideos`/`getVideoDetail`；精选完整源列表托管于远端，导入时经由 `/api/proxy` 拉取 |
| 状态存储 | `src/lib/store/*` | Zustand，均经 `localStorage` 持久化：`settings-store`、`favorites-store`、`history-store`、`watch-later-store`、`search-history-store`、`unlock-store`（密码门控）、`sidebar-store`、`tag-orders-store`、`header-reset-store` |
| 高级模式隔离 | `src/components/premium/PremiumContent.tsx`、`lib/hooks/usePremiumContent.ts` | 路由/源/历史/收藏与标准内容完全分离 |

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
