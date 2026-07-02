# ByCut

[English](./README.md) | [中文](./README.zh-CN.md)

开源的浏览器端视频编辑器 —— 免费的 CapCut 替代方案，具备完整的时间线编辑、AI 字幕生成和 GPU 加速渲染。所有剪辑与导出均在浏览器本地完成，不会上传任何数据到服务器。

预览：https://bycut.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png)

## 功能特性

- **多轨道时间线编辑**
  - 在多轨道时间线上拖放素材
  - 时间线书签，支持拖拽移动
  - 完整的撤销/重做命令系统

- **AI 功能**
  - 字幕自动生成
  - 文字转语音合成

- **丰富的媒体效果**
  - 贴纸和转场效果
  - 关键帧动画
  - 导出单帧画面

- **播放与预览**
  - 可调节播放速度
  - 音量控制
  - 实时画布预览

- **用户体验**
  - GPU 加速画布渲染
  - 自定义键盘快捷键
  - 国际化支持（英文 / 中文）
  - 深色 / 浅色主题
  - 响应式编辑器布局

## 技术栈

- **框架** — Next.js（App Router，`app/[locale]/` 下的多语言路由）
- **状态管理** — Zustand
- **视频处理** — FFmpeg.wasm + mediabunny
- **AI** — Hugging Face Transformers，运行在 Web Worker 中
- **音频** — WaveSurfer.js
- **国际化** — next-intl（en / zh）

## 快速开始

### 前置条件

- Node.js 与 pnpm（版本见 monorepo 根目录 `package.json`）

### 安装

```bash
# 在 monorepo 根目录执行
pnpm install
```

### 开发

```bash
pnpm --filter @cdlab996/bycut dev
```

启动后访问 `http://bycut.localhost:3355`（通过 `@dotns/nsl` 路由，无需手动寻找端口）。

### 构建 / 部署

```bash
pnpm --filter @cdlab996/bycut build     # next build
pnpm --filter @cdlab996/bycut build:cf  # @cloudflare/next-on-pages，用于 Cloudflare Pages 部署
```

## 架构

ByCut 没有服务端组件 —— 它是一个完全运行在客户端的、基于管理器（manager）的编辑器内核，依托浏览器存储（IndexedDB / OPFS）和一个用于 AI 转录的 Web Worker。

| 层级 | 路径 | 职责 |
|---|---|---|
| 编辑器管理器 | `src/core/managers/` | 各自独立的编辑器子系统：`media-manager`、`timeline-manager`、`playback-manager`、`selection-manager`、`audio-manager`、`renderer-manager`、`scenes-manager`、`save-manager`、`project-manager` |
| 撤销/重做 | `src/core/managers/commands.ts` | 各管理器共用的命令总线 |
| 画布渲染器 | `src/services/renderer/` | `canvas-renderer.ts` + `scene-builder.ts` + `scene-exporter.ts`，加上一套基于节点的渲染树（`nodes/`），用于 GPU 加速的画布合成 |
| 存储 | `src/services/storage/` | `service.ts` 搭配可插拔适配器 —— `indexeddb-adapter.ts` 与 `opfs-adapter.ts` —— 以及 `services/storage/migrations/` 中的项目版本迁移逻辑 |
| AI 转录 | `src/services/transcription/` | Hugging Face Transformers 运行在 Web Worker（`worker.ts`）中，用于 AI 字幕生成 |
| 缩略图与帧缓存 | `src/services/timeline-thumbnail/`、`src/services/video-cache/` | 时间线帧缩略图生成与帧缓存 |
| UI 状态（Zustand） | `src/stores/` | `editor-store`、`timeline-store`、`panel-store`、`media-preview-store`、`keybindings-store`、`assets-panel-store`、`sounds-store`、`stickers-store` |
| 键位绑定 | `src/stores/keybindings/` | 用户可自定义并持久化的键盘快捷键 |

## 隐私声明

- 所有视频处理均在浏览器本地完成
- 不会上传任何数据到服务器
- 无需注册或登录
- 开源可审计

## 许可证

[MIT](../../LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
