# Flox

[English](./README.md)

基于 Next.js 16、React 19 和 Tailwind CSS 4 构建的现代视频聚合与播放平台。

## 功能特性

- **多源并行搜索** - 通过 SSE 流式同时从 38+ 个内置视频源返回结果
- **HLS/M3U8 播放** - 火山引擎 VePlayer，支持广告过滤（关键词、启发式、SCTE-35）
- **液态玻璃设计** - 毛玻璃 UI，含 backdrop-filter、光晕效果与景深分层
- **Service Worker 缓存** - M3U8 清单与视频分片缓存（7 天 TTL，最大 1 GB）
- **观看历史与收藏** - 最多 50 条历史记录，支持播放位置续播，收藏持久保存
- **密码保护** - 本地或环境变量密码门控，支持 session 持久化
- **高级模式** - 独立路由、独立源、独立历史与收藏
- **响应式设计** - 移动端优化播放器，支持触控手势与横竖屏切换
- **主题系统** - 亮色 / 暗色 / 跟随系统，基于 View Transition API
- **源管理** - 自定义添加源，拖拽排序，启用/禁用，配置导入/导出

## 技术栈

- Next.js 16（App Router，Edge Runtime API 路由）
- React 19 + TypeScript
- Tailwind CSS 4
- Zustand 5（状态管理，localStorage 持久化）
- TanStack Query
- HLS.js + 火山引擎 VePlayer
- @dnd-kit（拖拽排序源管理）
- Cloudflare Pages

## 开发

```bash
pnpm dev:flox
```

## 部署

**Cloudflare Pages：**

```bash
pnpm --filter @cdlab996/flox run build:cf
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_SITE_NAME` | 顶部导航显示名称 |
| `NEXT_PUBLIC_SITE_TITLE` | 浏览器标签页标题 |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Meta 描述 |
| `ACCESS_PASSWORD` | 全局密码保护 |
| `PERSIST_PASSWORD` | 密码持久化（默认：true） |
| `NEXT_PUBLIC_SUBSCRIPTION_SOURCES` | 从 JSON URL 自动加载源（逗号分隔） |
| `AD_KEYWORDS` | 自定义广告过滤关键词（逗号分隔） |
| `AD_KEYWORDS_FILE` | 广告关键词文件路径 |

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
