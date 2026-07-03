# value-vision

[English](./README.md) | [中文](./README.zh-CN.md)

A no-signup converter for re-examining purchasing power: drop an amount into any field — crypto, fiat, or a real-world product — and every other field updates to match, so a Bitcoin balance, a salary, and a MacBook price all sit on the same scale.

Preview: https://values.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png)

## Features

- **Multi-way live converter** (`hooks/useCurrencyConverter.ts`)
  - Type into any field and every other field recalculates instantly
  - Each field independently picks its own currency, excluding currencies already in use elsewhere on the board (`CurrencySelector.tsx`)
- **Three asset categories** (`lib/currencies.ts`)
  - **Crypto** — BTC, ETH, SOL, BNB, OKB (priced via CoinGecko IDs)
  - **Fiat** — USD, CNY, JPY, KRW, SGD, AED, HKD, MYR
  - **Products** — iPhone 17, MacBook Pro, Xiaomi SU7, Porsche 718, Ferrari Roma, each anchored to a fixed price in its home currency
- **Live rate fetch with offline fallback** (`lib/exchangeRate.ts`, `lib/rates.ts`)
  - Crypto prices from the CoinGecko simple-price API, fiat rates from exchangerate-api.com, fetched in parallel
  - Product prices are converted to USD from their fixed price, then cross-rated against every other currency (crypto ↔ crypto, crypto ↔ fiat, fiat ↔ fiat, and both ↔ products)
  - A manual refresh button re-fetches rates; if the fetch fails, the app falls back to a bundled snapshot (`defaultRates`) so the converter still works
- **Dark mode** via `next-themes`

## Tech Stack

- **Framework** — Next.js (App Router), React, TypeScript
- **UI** — `@cdlab996/ui` (shadcn/ui primitives + reactbits effects), Tailwind CSS v4
- **Rate sources** — CoinGecko `simple/price` API (crypto), exchangerate-api.com (fiat)
- **No backend** — runs entirely client-side; rates are fetched directly from the browser

## Getting Started

### Prerequisites

- Node.js, pnpm (see the monorepo root for versions)

### Install

```bash
# From the monorepo root
pnpm install
```

### Development

```bash
pnpm --filter @cdlab996/values dev
```

Runs at `http://values.localhost:3355` (via `@dotns/nsl` — no port hunting).

### Build / Deploy

```bash
# Production build
pnpm --filter @cdlab996/values build

# Cloudflare Pages build (@cloudflare/next-on-pages)
pnpm --filter @cdlab996/values build:cf
```

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
