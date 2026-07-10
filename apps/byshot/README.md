# byshot

[English](./README.md) | [中文](./README.zh-CN.md)

A personal photography collection with a Pinterest-style masonry grid, backed entirely by Cloudinary — no local image assets, no database.

Preview: https://byshot.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byshot/og-image.png)

## Features

- **Masonry gallery** — Responsive columns (`columns-1 sm:columns-2 xl:columns-3 2xl:columns-4`) rendered by `src/components/Gallery.tsx` from a server-fetched Cloudinary listing
- **Full-screen lightbox** (`src/components/Modal.tsx` + `SharedModal.tsx`)
  - Keyboard navigation (`←` / `→` / `Esc`) via `react-use-keypress`
  - Touch swipe navigation via `react-swipeable`
  - Animated slide transitions powered by [`motion`](https://motion.dev/)
  - Bottom thumbnail strip, filtered to the 15 photos on either side of the current index
  - Open the full-size original or download it; on the deep-link route, share to X instead
- **Blur placeholders** — `src/utils/generateBlurPlaceholder.ts` fetches a tiny Cloudinary transform (`f_jpg,w_8,q_70`) for each photo and inlines it as a base64 data URL, capped at the first 30 photos per SSR to stay under the Workers subrequest limit
- **Deep links** — `src/app/p/[photoId]/page.tsx` renders a standalone, statically-generated carousel route per photo; `/?photoId=N` opens the same photo as an in-grid modal
- **Scroll restore** — `src/utils/useLastViewedPhoto.ts` (Zustand) remembers the last-viewed photo so closing the lightbox scrolls the grid back to it

## Tech Stack

- **Framework** — Next.js (App Router, RSC) + React + TypeScript
- **Image source** — Cloudinary Node SDK (`src/utils/cachedImages.ts` — server-side `cloudinary.v2.search` per request, in-memory cache)
- **Animation** — `motion` for lightbox transitions, `react-swipeable` for touch, `react-use-keypress` for keyboard
- **State** — Zustand (last-viewed-photo scroll restore)
- **UI** — [`@cdlab/ui`](../../packages/ui) (Dialog primitives + shared Tailwind v4 theme), Tailwind CSS v4
- **Platform** — Cloudflare Pages via `@cloudflare/next-on-pages`

## Getting Started

### Prerequisites

- Node.js + pnpm (workspace-managed, see repo root)
- A Cloudinary account with photos uploaded under a folder

### Install

```bash
pnpm install
```

### Development

```bash
pnpm --filter @cdlab/byshot dev
```

Open `http://byshot.localhost:3355` (routed through `@dotns/nsl`).

### Build / Deploy

```bash
# Next.js build
pnpm --filter @cdlab/byshot build

# Cloudflare Pages build
pnpm --filter @cdlab/byshot build:cf
```

## Configuration

Create `apps/byshot/.env.local`:

| Variable                            | Description                                     | Required |
| ------------------------------------ | ------------------------------------------------ | -------- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`  | Cloudinary cloud name                             | yes      |
| `CLOUDINARY_API_KEY`                 | Cloudinary API key                                | yes      |
| `CLOUDINARY_API_SECRET`              | Cloudinary API secret                             | yes      |
| `CLOUDINARY_FOLDER`                  | Cloudinary folder to source photos from           | yes      |

Get credentials from the [Cloudinary Dashboard](https://cloudinary.com/users/register) → Settings → Access Keys.

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
