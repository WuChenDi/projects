# bytts

[English](./README.md)

免费在线文字转语音工具。支持 300+ 种语音、语速语调调节、长文本自动分段，以及持久化生成历史。

预览：https://cctts.pages.dev/

## 功能特性

- **300+ 种语音** - 多语言多口音，按语言区域分组，方便快速筛选
- **语速调节** - 支持 −100% 到 +100% 范围调整
- **语调调节** - 支持 −100% 到 +100% 范围调整
- **停顿插入** - 在光标处插入 SSML `<break>` 标签（0–10 秒）
- **长文本支持** - 最多 50,000 字符，自动分段处理并合并为单个音频文件
- **试听模式** - 生成前用前 20 个字快速预览效果
- **持久化历史** - 生成历史跨 session 保留，音频 Blob 存储于 IndexedDB，元数据存储于 localStorage
- **音频下载** - MP3 格式下载，支持自定义文件名
- **密码保护** - 通过 `ACCESS_PASSWORD` 环境变量开启可选访问控制，支持配置 session 持久化
- **CORS API** - GET/POST 接口跨域可用，运行于 Edge Runtime

## 技术栈

- Next.js（App Router，Edge Runtime API 路由）
- React 19 + TypeScript
- TanStack Query
- Zustand（历史持久化，IndexedDB + localStorage）
- 可配置 TTS 后端
- Cloudflare Pages

## 本地开发

```bash
pnpm dev:bytts
```

## 部署

**Cloudflare Pages：**

```bash
pnpm --filter @cdlab996/bytts run build:cf
```

## API

所有接口均支持 CORS，运行于 Edge Runtime。

### `POST /api/tts`

**请求体（JSON）：**

| 字段      | 类型    | 默认值                             | 说明                          |
| --------- | ------- | ---------------------------------- | ----------------------------- |
| `text`    | string  | —                                  | 要转换的文本（必填）          |
| `voice`   | string  | `zh-CN-XiaoxiaoMultilingualNeural` | 语音 short name               |
| `rate`    | number  | `0`                                | 语速调节（−100 到 100）       |
| `pitch`   | number  | `0`                                | 语调调节（−100 到 100）       |
| `format`  | string  | `audio-24khz-48kbitrate-mono-mp3`  | TTS 输出格式                  |
| `preview` | boolean | `true`                             | `false` 时响应头携带下载信息  |

**响应：** `audio/mpeg` 音频流

### `GET /api/tts`

与 POST 相同，通过查询参数传入：

```
/api/tts?t=你好&v=zh-CN-XiaoxiaoNeural&r=0&p=0&o=audio-24khz-48kbitrate-mono-mp3&d=false
```

| 参数 | 说明                        |
| ---- | --------------------------- |
| `t`  | 文本（必填）                |
| `v`  | 语音 short name             |
| `r`  | 语速（−100 到 100）         |
| `p`  | 语调（−100 到 100）         |
| `o`  | 输出格式                    |
| `d`  | `true` 时触发文件下载       |

### `GET /api/voices`

获取可用语音列表。

| 参数 | 说明                                                        |
| ---- | ----------------------------------------------------------- |
| `l`  | 语言过滤，如 `zh`、`en-US`                                 |
| `f`  | 格式：不传返回完整 JSON 数组，`0` 返回 YAML 列表，`1` 返回 map |

## 环境变量

| 变量                      | 说明                                      | 默认值 |
| ------------------------- | ----------------------------------------- | ------ |
| `ACCESS_PASSWORD`         | 站点访问密码，留空则关闭密码保护          | —      |
| `PERSIST_PASSWORD`        | `false` 时每次 session 需重新输入密码     | `true` |
| `MICROSOFT_CLIENTTRACEID` | 传递给 TTS 后端的客户端追踪 ID            | —      |

## 许可证

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
