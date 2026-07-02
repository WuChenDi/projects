# bytts

[English](./README.md) | [中文](./README.zh-CN.md)

免费的浏览器端文字转语音工具 —— 300+ 种语音、语速/语调调节、长文本自动分段，并支持通过 API 管理器接入自定义 TTS 后端。

预览：https://bytts.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bytts/og-image.png)

## 功能特性

- **SSML 语音合成** —— `POST /api/tts`（Edge Runtime，`src/app/api/tts/route.ts`）构建 SSML 请求体（`<mstts:express-as>` + `<prosody rate/pitch>`），并转发至 Microsoft Azure Cognitive Services 语音接口
- **音频流式返回** —— 接口以 `audio/mpeg` 响应返回合成的音频；生成完整语音前可先用前 20 个字快速试听
- **级联式语音 / 语速 / 语调控制** —— 语音按语言区域分组，通过级联选择器筛选；语速与语调支持 `-100` 到 `+100` 的滑块调节；支持插入 `<break>` 停顿标签（0–10 秒）；最长 50,000 字符文本自动分段并合并
- **API 管理器** —— 内置两个提供方（Edge API、OpenAI 格式的 "OAI-TTS"），并支持添加自定义提供方；相同槽位的自定义提供方会**覆盖对应的内置提供方**，内置提供方的端点/密钥/限制也可就地编辑，并可随时还原为默认值
- **自定义认证 Header** —— 每个提供方（内置或自定义）均可配置独立的认证 Header 名称（默认 `Authorization`）与密钥；密钥填入 `Authorization` 时会自动添加 `Bearer` 前缀，其他 Header 名称则原样发送
- **批量删除** —— 支持多选批量删除已保存的自定义 API 配置，同时提供单条复制/编辑以及 JSON 导出/导入
- **持久化历史记录** —— 生成历史记录中的音频 Blob 存储于 IndexedDB，元数据存储于 localStorage；支持单条下载或全部打包为 ZIP 下载
- **密码保护** —— 通过 `ACCESS_PASSWORD` 环境变量开启可选访问控制，支持配置 session 持久化

## 技术栈

- **框架** —— Next.js（App Router，Edge Runtime API 路由）
- **语音后端** —— Microsoft Azure Cognitive Services Speech（SSML 语音合成），并可通过 API 管理器接入任意 OpenAI 格式或 Edge 格式的 TTS API
- **UI** —— React 19 + TypeScript、`@cdlab996/ui`、TanStack Form / Query
- **状态管理** —— Zustand（`useApiStore` 管理提供方配置，`useHistoryStore` 通过 IndexedDB + localStorage 持久化历史记录）
- **部署** —— Cloudflare Pages（`@cloudflare/next-on-pages`）

## 快速开始

### 前置条件

- Node.js 20+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 本地开发

```bash
pnpm dev:bytts
```

通过 `@dotns/nsl` 在 `http://bytts.localhost:3355` 打开。

### 构建 / 部署

```bash
# 生产构建
pnpm --filter @cdlab996/bytts build

# Cloudflare Pages 构建
pnpm --filter @cdlab996/bytts run build:cf
```

## API

所有接口运行于 Edge Runtime。

### `POST /api/tts`

**请求体（JSON）：**

| 字段      | 类型    | 默认值                             | 说明                         |
| --------- | ------- | ---------------------------------- | ---------------------------- |
| `text`    | string  | —                                  | 要转换的文本（必填）         |
| `voice`   | string  | `zh-CN-XiaoxiaoMultilingualNeural` | 语音 short name              |
| `rate`    | number  | `0`                                | 语速调节（−100 到 100）      |
| `pitch`   | number  | `0`                                | 语调调节（−100 到 100）      |
| `format`  | string  | `audio-24khz-48kbitrate-mono-mp3`  | TTS 输出格式                 |
| `preview` | boolean | `true`                             | `false` 时响应头携带下载信息 |

**响应：** `audio/mpeg` 音频流

## 环境变量

| 变量                      | 说明                                  | 默认值 |
| ------------------------- | ------------------------------------- | ------ |
| `ACCESS_PASSWORD`         | 站点访问密码，留空则关闭密码保护      | —      |
| `PERSIST_PASSWORD`        | `false` 时每次 session 需重新输入密码 | `true` |
| `MICROSOFT_CLIENTTRACEID` | 传递给 TTS 后端的客户端追踪 ID        | —      |

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
