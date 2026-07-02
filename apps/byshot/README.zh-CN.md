# byshot

[English](./README.md) | [中文](./README.zh-CN.md)

个人摄影作品集，瀑布流布局，完全基于 Cloudinary 驱动 —— 无本地图片资源，无数据库。

预览：https://byshot.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byshot/og-image.png)

## 功能特性

- **瀑布流图库** — 响应式列数（`columns-1 sm:columns-2 xl:columns-3 2xl:columns-4`），由 `src/components/Gallery.tsx` 基于服务端拉取的 Cloudinary 列表渲染
- **全屏灯箱**（`src/components/Modal.tsx` + `SharedModal.tsx`）
  - 键盘导航（`←` / `→` / `Esc`），基于 `react-use-keypress`
  - 触屏滑动导航，基于 `react-swipeable`
  - 基于 [`motion`](https://motion.dev/) 的滑动过渡动画
  - 底部缩略图条，仅显示当前索引前后各 15 张照片
  - 打开或下载原图；在深度链接路由下则改为分享到 X
- **模糊占位图** — `src/utils/generateBlurPlaceholder.ts` 为每张照片拉取极小的 Cloudinary 转换图（`f_jpg,w_8,q_70`），内联为 base64 data URL，每次 SSR 仅处理前 30 张，避免超出 Workers 出站子请求上限
- **深度链接** — `src/app/p/[photoId]/page.tsx` 为每张照片渲染独立的静态生成轮播路由；`/?photoId=N` 则在网格内以模态形式打开同一张照片
- **滚动位置记忆** — `src/utils/useLastViewedPhoto.ts`（Zustand）记住最后查看的照片，关闭灯箱后自动滚动回该位置

## 技术栈

- **框架** — Next.js（App Router、RSC）+ React + TypeScript
- **图片来源** — Cloudinary Node SDK（`src/utils/cachedImages.ts` —— 每次请求服务端调用 `cloudinary.v2.search`，内存缓存）
- **动画** — `motion` 负责灯箱过渡，`react-swipeable` 负责触屏，`react-use-keypress` 负责键盘
- **状态管理** — Zustand（最后查看照片的滚动位置记忆）
- **UI** — [`@cdlab996/ui`](../../packages/ui)（Dialog 组件 + 共享 Tailwind v4 主题），Tailwind CSS v4
- **部署平台** — Cloudflare Pages（通过 `@cloudflare/next-on-pages`）

## 快速开始

### 前置条件

- Node.js + pnpm（由仓库根目录统一管理）
- 一个已在指定文件夹下上传照片的 Cloudinary 账户

### 安装

```bash
pnpm install
```

### 本地开发

```bash
pnpm --filter @cdlab996/byshot dev
```

访问 `http://byshot.localhost:3355`（通过 `@dotns/nsl` 路由）。

### 构建 / 部署

```bash
# Next.js 构建
pnpm --filter @cdlab996/byshot build

# Cloudflare Pages 构建
pnpm --filter @cdlab996/byshot build:cf
```

## 配置

新建 `apps/byshot/.env.local`：

| 变量                                  | 说明                             | 必填 |
| ------------------------------------- | -------------------------------- | ---- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`   | Cloudinary cloud name             | 是   |
| `CLOUDINARY_API_KEY`                  | Cloudinary API key                | 是   |
| `CLOUDINARY_API_SECRET`               | Cloudinary API secret             | 是   |
| `CLOUDINARY_FOLDER`                   | 作为图片来源的 Cloudinary 文件夹  | 是   |

凭据可在 [Cloudinary Dashboard](https://cloudinary.com/users/register) → Settings → Access Keys 获取。

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
