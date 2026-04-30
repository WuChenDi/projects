# Flox

[English](./README.md)

基于 Next.js 16、React 19 和 Tailwind CSS 4 构建的现代视频聚合与播放平台。

预览：https://floxx.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flox/og-image.png)

## 功能特性

- **多源并行搜索** - 通过 SSE 流式同时从 38+ 个内置视频源返回结果
- **HLS/M3U8 播放** - 火山引擎 VePlayer，支持多层广告过滤（关键词、启发式、激进、SCTE-35）
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

## 广告过滤

Flox 内置了多层 M3U8 广告过滤系统。在 **设置 > 播放器设置 > 广告过滤** 中配置。

### 模式

| 模式       | 行为                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **关闭**   | 不过滤                                                                                                                                                                                         |
| **关键词** | 移除 URL 中包含广告关键词（内置 + 自定义）的片段。支持 `#EXT-X-CUE-OUT/IN`（SCTE-35）标签检测。                                                                                                |
| **启发式** | 关键词 + 基于 block 的评分分析。按 `#EXT-X-DISCONTINUITY` 将播放列表切分为 block，从最大 block 学习正片特征，然后对每个 block 进行多维度评分。评分 >= 5.0 的 block 被移除。                    |
| **激进**   | 与启发式相同的评分（阈值降至 >= 3.0），**同时删除所有 `#EXT-X-DISCONTINUITY` 标签**。适用于广告片段与正片共享相同 CDN、路径、文件名格式和时长的源——此时唯一的信号就是 DISCONTINUITY 标记本身。 |

### 启发式评分维度

| 维度             | 分值        | 说明                                                                    |
| ---------------- | ----------- | ----------------------------------------------------------------------- |
| CUE 标签         | 10.0        | `#EXT-X-CUE-OUT` / `#EXT-X-CUE-IN`（SCTE-35 标准）                      |
| 路径前缀不匹配   | +5.0        | block 中所有片段来自与正片不同的 CDN 目录                               |
| 小 block 检测    | +5.0 / +3.0 | block 片段数 <= 中位数的 20% / 35%                                      |
| TS 序列号断裂    | +4.0        | 对于顺序编号的源（00001.ts, 00002.ts, ...），block 的编号不在正片范围内 |
| 文件名长度突变   | +3.0        | 平均文件名长度与正片相差 > 2 个字符                                     |
| URL 关键词匹配   | +2.5/片段   | URL 包含广告相关关键词（advert、preroll、vast 等）                      |
| 文件名模式不匹配 | +1.5        | 所有文件名与正片 block 的公共前缀模式不同                               |
| EXTINF 时长异常  | +1.5        | 主要片段时长与正片相差 > 30%                                            |

### 自定义关键词

选择非关闭模式后，会出现自定义关键词输入框（每行一个），关键词会与片段 URL 进行匹配。

也可以通过环境变量注入关键词（见下方环境变量）。

### 架构

```
HLS.js AdFilterLoader（拦截 manifest/level 加载）
  → filterM3u8Ad()
    1. 启发式 block 分析：parseBlocks() → learnMainPattern() → scoreBlock()
    2. CUE 标签状态机（SCTE-35 CUE-OUT / CUE-IN）
    3. 关键词回溯
    4. DISCONTINUITY 删除（仅激进模式）
    5. URL 规范化（相对路径 → 绝对路径，用于 Blob 播放）

原生 HLS（Safari/iOS）
  → 拉取 master playlist → 递归处理子播放列表 → Blob URL 替换
```

## 环境变量

| 变量                               | 说明                               |
| ---------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SITE_NAME`            | 顶部导航显示名称                   |
| `NEXT_PUBLIC_SITE_TITLE`           | 浏览器标签页标题                   |
| `NEXT_PUBLIC_SITE_DESCRIPTION`     | Meta 描述                          |
| `ACCESS_PASSWORD`                  | 全局密码保护                       |
| `PERSIST_PASSWORD`                 | 密码持久化（默认：true）           |
| `NEXT_PUBLIC_SUBSCRIPTION_SOURCES` | 从 JSON URL 自动加载源（逗号分隔） |
| `AD_KEYWORDS`                      | 自定义广告过滤关键词（逗号分隔）   |
| `AD_KEYWORDS_FILE`                 | 广告关键词文件路径                 |

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
