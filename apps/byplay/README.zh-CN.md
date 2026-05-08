# ByCut

[English](./README.md) | [中文](./README.zh-CN.md)

Open-source browser-based video editor — a free CapCut alternative. No installation, no uploads, everything runs locally in your browser.

> All video processing is done locally in the browser. No data is uploaded to any server.

Preview: https://bycut.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png)

## Features

- **Multi-track Timeline Editing**
  - Drag-and-drop clips on a multi-track timeline
  - Timeline bookmarks with drag & drop support
  - Full undo/redo command system

- **AI-powered Features**
  - Caption/subtitle generation
  - Text-to-speech synthesis

- **Rich Media Effects**
  - Sticker and transition effects
  - Keyframe animation
  - Export individual frames

- **Playback & Preview**
  - Adjustable playback speed
  - Volume control
  - Real-time preview

- **User Experience**
  - GPU-accelerated canvas rendering
  - Customizable keyboard shortcuts
  - i18n support (English / Chinese)
  - Dark / light theme
  - Responsive editor layout

## Tech Stack

- **Framework**: Next.js (App Router, static export)
- **State**: Zustand
- **Video**: FFmpeg.wasm
- **AI**: Hugging Face Transformers
- **Audio**: WaveSurfer.js
- **i18n**: next-intl (en/zh)

## Privacy

- All video processing is done locally in the browser
- No data is uploaded to any server
- No registration or login required
- Open source and auditable

## License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
