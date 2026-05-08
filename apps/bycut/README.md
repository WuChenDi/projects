# ByCut

[English](./README.md) | [中文](./README.zh-CN.md)

Open-source browser-based video editor — a free alternative to CapCut. No installation, no uploads, all processing runs locally in your browser.

> All video processing is done locally in the browser. No data is uploaded to any server.

Preview: https://bycut.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png)

## Features

- **Multi-track Timeline Editing**
  - Drag and drop media clips onto a multi-track timeline
  - Timeline bookmarks with drag-to-reposition support
  - Full undo/redo command system

- **AI Features**
  - Automatic caption/subtitle generation
  - Text-to-speech synthesis

- **Rich Media Effects**
  - Stickers and transition effects
  - Keyframe animation
  - Export individual frames as images

- **Playback & Preview**
  - Adjustable playback speed
  - Volume control
  - Real-time canvas preview

- **User Experience**
  - GPU-accelerated canvas rendering
  - Customizable keyboard shortcuts
  - Internationalization support (English / Chinese)
  - Dark / Light theme
  - Responsive editor layout

## Tech Stack

- **Framework**: Next.js (App Router, static export)
- **State**: Zustand
- **Video processing**: FFmpeg.wasm + mediabunny
- **AI**: Hugging Face Transformers (Web Worker)
- **Audio**: WaveSurfer.js
- **i18n**: next-intl (en / zh)

## Privacy

- All video processing runs locally in the browser
- No data is uploaded to any server
- No registration or login required
- Open-source and auditable

## License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
