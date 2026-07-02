# value-vision

[English](./README.md) | [中文](./README.zh-CN.md)

一个无需注册的换算工具，帮你重新审视购买力：在任意一栏输入金额——无论是加密货币、法币还是真实商品——其余各栏都会同步换算,让比特币余额、工资和 MacBook 价格站在同一个尺度上比较。

预览：https://values.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png)

## 功能特性

- **多向实时换算器**（`hooks/useCurrencyConverter.ts`）
  - 在任意一栏输入,其余各栏立即重新计算
  - 每一栏可独立选择自己的币种,并自动排除已被其他栏占用的币种（`CurrencySelector.tsx`）
- **三大资产类别**（`lib/currencies.ts`）
  - **加密货币** — BTC、ETH、SOL、BNB、OKB（通过 CoinGecko ID 获取价格）
  - **法币** — USD、CNY、JPY、KRW、SGD、AED、HKD、MYR
  - **商品** — iPhone 17、MacBook Pro、小米 SU7、保时捷 718、法拉利 Roma,每个商品都锚定其本位币种下的固定价格
- **实时汇率获取，支持离线兜底**（`lib/exchangeRate.ts`、`lib/rates.ts`）
  - 加密货币价格来自 CoinGecko 的 simple-price API,法币汇率来自 exchangerate-api.com,两者并行获取
  - 商品价格先按固定价格换算为 USD,再与其他所有币种交叉换算（加密货币 ↔ 加密货币、加密货币 ↔ 法币、法币 ↔ 法币,以及两者 ↔ 商品）
  - 手动刷新按钮可重新拉取汇率；若拉取失败,应用会回退到内置的汇率快照（`defaultRates`）,换算器仍可正常使用
- 通过 `next-themes` 支持**深色模式**

## 技术栈

- **框架** — Next.js（App Router）、React、TypeScript
- **UI** — `@cdlab996/ui`（shadcn/ui 组件 + reactbits 特效）、Tailwind CSS v4
- **汇率来源** — CoinGecko `simple/price` API（加密货币）、exchangerate-api.com（法币）
- **无后端** — 完全在客户端运行,汇率直接由浏览器发起请求获取

## 快速开始

### 前置条件

- Node.js、pnpm（版本见 monorepo 根目录）

### 安装

```bash
# 在 monorepo 根目录执行
pnpm install
```

### 开发

```bash
pnpm --filter @cdlab996/values dev
```

通过 `@dotns/nsl` 运行在 `http://values.localhost:3355`（无需手动寻找端口）。

### 构建 / 部署

```bash
# 生产构建
pnpm --filter @cdlab996/values build

# Cloudflare Pages 构建（@cloudflare/next-on-pages）
pnpm --filter @cdlab996/values build:cf
```

## License

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
