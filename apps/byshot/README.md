# byshot

[English](./README.md) | [中文](./README.zh-CN.md)

A sleek, responsive personal photography collection powered by Cloudinary, with full-screen lightbox, keyboard/swipe navigation, and blurred placeholders.

Preview: https://byshot.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/image-gallery/index.png)

## Features

- **Masonry layout** — Responsive columns (1 / 2 / 3 / 4) driven by viewport width
- **Full-screen lightbox**
  - Keyboard navigation (`←` / `→` / `Esc`)
  - Touch swipe support
  - Animated transitions powered by [motion](https://motion.dev/)
  - Bottom thumbnail strip with active-image scaling
- **Blur placeholders** — Tiny Cloudinary-transformed JPEGs (`w_8,q_70`) inlined as base64 data URLs for instant perceived load
- **Deep links** — `/p/[photoId]` for single-photo carousel routes and `/?photoId=N` for in-grid modal navigation
- **One-click actions** — Open full-size original or download the original JPEG
- **Last-viewed scroll restore** — Returning from the lightbox auto-scrolls the gallery back to the last viewed photo
- **Cloudinary-driven** — Photos are pulled from a configurable Cloudinary folder; no local image assets required

## Tech Stack

- Next.js 16 (App Router, RSC)
- React 19 + TypeScript
- Cloudinary Node SDK (server-side fetch + on-the-fly transforms)
- `motion` for transitions, `react-swipeable` for touch, `react-use-keypress` for keyboard
- Zustand for last-viewed-photo state
- [`@cdlab996/ui`](../../packages/ui) — Dialog (radix-based) + shared Tailwind v4 theme
- Tailwind CSS v4
- Cloudflare Pages (`@cloudflare/next-on-pages`)

## Development

```bash
pnpm dev:byshot
```

Open <http://byshot.localhost:3355>.

## Deployment

**Cloudflare Pages:**

```bash
pnpm --filter @cdlab996/byshot run pages:build
```

## Environment Variables

Create `apps/byshot/.env.local`:

| Variable                            | Description                                    | Required |
| ----------------------------------- | ---------------------------------------------- | -------- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name                     | yes      |
| `CLOUDINARY_API_KEY`                | Cloudinary API key                             | yes      |
| `CLOUDINARY_API_SECRET`             | Cloudinary API secret                          | yes      |
| `CLOUDINARY_FOLDER`                 | Folder under your Cloudinary account to source | yes      |

Get credentials from [Cloudinary Dashboard](https://cloudinary.com/users/register) → Settings → Access Keys.

## Acknowledgements

Forked from the official [Next.js Cloudinary example](https://github.com/vercel/next.js/tree/canary/examples/with-cloudinary).

## License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
