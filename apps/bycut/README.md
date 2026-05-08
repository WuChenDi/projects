# byplay

[English](./README.md) | [中文](./README.zh-CN.md)

Online video player supporting HLS (M3U8 adaptive bitrate), MP4, WebM, OGG, and more.

> All video processing is done locally in the browser. No data is uploaded to any server.

Preview: https://byplay.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png)

## Features

- **Multi-format Playback**
  - HLS/M3U8 via hls.js with adaptive bitrate
  - Direct playback for MP4, WebM, OGG, MOV, MKV, and more
  - Auto-detects format — HLS config panels hidden for direct video

- **HLS Controls**
  - Manual quality level switching or auto ABR
  - Configurable buffer, ABR, performance, and retry settings
  - Real-time stats: bandwidth, buffered, dropped frames, current level

- **General Playback**
  - Adjustable playback rate (0.25x – 4x)
  - Auto-play toggle
  - Event logs for debugging

- **Cross-tool Integration**
  - One-click jump to [vidl](https://vidl.pages.dev/) to download the current video
  - Locale is preserved across navigation (en/zh)

## License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
