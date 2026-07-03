# Repo Changelog

[English](./README.md) | [中文](./README.zh-CN.md)

在一个统一的、浏览器端处理的看板中追踪多个 GitHub 仓库的发布与更新日志——无需账号，选择结果也不会存储在服务端。基于 **Nuxt 4 (Vue 3)** 构建，数据来源于 [ungh.cc](https://ungh.cc)。

预览地址：https://repo-changelog.vercel.app/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/index.png)
![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/repo-changelog/repos.png)

## 功能特性

- **仓库搜索**（`app/pages/repos.vue`）
  - 支持按单个仓库（`owner/repo`）、用户或组织搜索
  - 结果可按 star 数、fork 数、名称或最近更新时间排序
  - 完全在客户端调用 `ungh.cc` API 完成——服务端不承担搜索逻辑

- **多仓库追踪**
  - 一次选择并管理多个仓库
  - 选择结果通过 URL 分享持久化，可以把某一组仓库组合以链接形式分享给他人
  - 收藏分组（`app/composables/useFavoriteGroups.ts`）——通过 `useStorage` 存储在客户端的、可复用的命名仓库集合

- **统一的更新日志看板**（`app/pages/index.vue`）
  - 所有已选仓库的发布记录按时间顺序汇总展示
  - 可展开的发布说明，通过 `@nuxtjs/mdc` 完整渲染 markdown
  - 直接链接到 GitHub 发布页

## 技术栈

- **框架** — Nuxt 4, Vue 3
- **UI** — `@nuxt/ui`
- **Markdown** — `@nuxtjs/mdc`（支持 `diff`、`ts`、`tsx`、`vue`、`css`、`sh`、`js`、`json` 高亮）
- **组合式函数** — `@vueuse/nuxt`
- **渲染方式** — `/` 路由启用 ISR，60 秒重新验证一次（见 `nuxt.config.ts` 的 `routeRules`）
- **数据源** — [ungh.cc](https://ungh.cc)，可通过环境变量 `API_URL` 配置（`nuxt.config.ts`）
- **部署目标** — Vercel

> 该应用不受根目录 Biome 配置约束，使用自己独立的 lint/format 工具链。

## 快速开始

### 前置条件

- Node.js 20+
- pnpm（monorepo 根目录）

### 安装

```bash
# 在 monorepo 根目录执行
pnpm install
```

### 开发

```bash
pnpm --filter @cdlab996/repo-changelog dev
```

开发服务器地址为 `http://repo-changelog.localhost:3355`（通过 `@dotns/nsl` 提供）。

### 构建 / 部署

```bash
# 生产构建
pnpm --filter @cdlab996/repo-changelog build

# 静态生成
pnpm --filter @cdlab996/repo-changelog generate

# 本地预览生产构建
pnpm --filter @cdlab996/repo-changelog preview
```

## 许可证

[MIT](../../LICENSE) License © 2025-PRESENT [wudi](https://github.com/WuChenDi)
