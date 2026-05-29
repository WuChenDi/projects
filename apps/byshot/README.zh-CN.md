# byshot

[English](./README.md) | [中文](./README.zh-CN.md)

基于 Cloudinary 的个人摄影作品集，瀑布流布局，配备全屏灯箱、键盘/滑动导航、模糊占位图。

预览：https://byshot.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byshot/og-image.png)

## 功能特性

- **瀑布流布局** — 响应式列数（1 / 2 / 3 / 4），按视口宽度自适应
- **全屏灯箱**
  - 键盘导航（`←` / `→` / `Esc`）
  - 触屏滑动支持
  - 基于 [motion](https://motion.dev/) 的过渡动画
  - 底部缩略图条，当前图自动放大
- **模糊占位图** — 使用 Cloudinary 极小 JPEG（`w_8,q_70`）转 base64 data URL 内联，瞬时呈现感
- **深度链接** — `/p/[photoId]` 单图轮播路由，`/?photoId=N` 网格内模态切换
- **一键操作** — 打开原图或下载原图
- **滚动位置记忆** — 从灯箱返回时自动滚动回最后查看的照片
- **Cloudinary 驱动** — 照片从可配置的 Cloudinary 文件夹拉取，无需本地资源

## 技术栈

- Next.js 16（App Router、RSC）
- React 19 + TypeScript
- Cloudinary Node SDK（服务端拉取 + 即时转换）
- `motion` 动画、`react-swipeable` 触屏、`react-use-keypress` 键盘
- Zustand 管理"最后查看的照片"状态
- [`@cdlab996/ui`](../../packages/ui) — Dialog（基于 radix）+ 共享 Tailwind v4 主题
- Tailwind CSS v4
- Cloudflare Pages（`@cloudflare/next-on-pages`）

## 本地开发

```bash
pnpm dev:byshot
```

访问 <http://byshot.localhost:3355>。

## 部署

**Cloudflare Pages：**

```bash
pnpm --filter @cdlab996/byshot run pages:build
```

## 环境变量

新建 `apps/byshot/.env.local`：

| 变量名                              | 说明                              | 必填 |
| ----------------------------------- | --------------------------------- | ---- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary 账户的 cloud name      | 是   |
| `CLOUDINARY_API_KEY`                | Cloudinary API key                | 是   |
| `CLOUDINARY_API_SECRET`             | Cloudinary API secret             | 是   |
| `CLOUDINARY_FOLDER`                 | 作为图片来源的 Cloudinary 文件夹  | 是   |

凭据可在 [Cloudinary Dashboard](https://cloudinary.com/users/register) → Settings → Access Keys 获取。

## 致谢

Fork 自官方 [Next.js Cloudinary 示例](https://github.com/vercel/next.js/tree/canary/examples/with-cloudinary)。

## 许可证

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
