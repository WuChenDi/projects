# Video Downloader

[中文文档](./README.zh-CN.md)

Online video download tool supporting M3U8/HLS, MP4, and other video formats with range download, streaming, AES decryption, and MP4 conversion.

> All video processing is done locally in the browser. No data is uploaded to any server.

Preview: https://vidl.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/vidl/og-image.png)

## Features

- **Multi-format Support**
  - M3U8/HLS playlist parsing and segment download
  - Direct download for MP4, WebM, MKV, AVI, MOV, FLV, WMV, MPEG, TS
  - Auto-detect URL format — no manual switching needed

- **M3U8/HLS Download**
  - One-click M3U8 playlist parsing
  - Multi-quality stream selection
  - Real-time download progress with visual segment status
  - Pause / resume support
  - Auto-retry failed segments with exponential backoff
  - Original format (.ts) or MP4 conversion

- **Range Download**
  - Custom segment range via slider
  - File size estimation based on selected range

- **Stream Download (Recommended for large files)**
  - Near-zero memory usage
  - Download and write to disk simultaneously
  - Supports both .ts and MP4 output
  - Requires browser Streams API support

  > **Browser compatibility:**
  >
  > - Chrome 90+, Edge 90+, Firefox 88+
  > - Safari does not support stream download (falls back to normal download)

- **AES Decryption**
  - Auto-detect AES-128 encryption
  - Automatic key fetch and decryption
  - Standard HLS encryption format support

- **MP4 Conversion**
  - TS to MP4 transmuxing via mux.js
  - Audio/video track merging with timestamp sync
  - Browser-side conversion, no server needed

- **Cross-tool Integration**
  - One-click jump to [byplay](https://byplay.pages.dev/) to preview/play the current video
  - Locale is preserved across navigation (en/zh)

- **User Experience**
  - Click to retry individual failed segments
  - Progress bar + detailed segment grid
  - Hover tooltips for segment details
  - Responsive design for mobile
  - i18n support (English / Chinese)
  - Dark / light theme

## Quick Start

1. Open the [Video Downloader](https://vidl.pages.dev/)
2. Paste a video URL (M3U8, MP4, etc.)
3. Click **Parse** — the tool auto-detects the format
4. For M3U8: choose download method (Normal / Stream) and format (TS / MP4)
5. For direct video: click **Download Video**
6. File saves to your browser's default download directory

## Download Method Guide

| File Size  | Recommended Method | Notes                        |
| ---------- | ------------------ | ---------------------------- |
| < 100MB    | Normal Download    | Fast and simple              |
| 100-500MB  | Normal or Stream   | Choose based on memory       |
| > 500MB    | Stream Download    | Near-zero memory usage       |
| Direct URL | Direct Download    | Single file, no segmentation |

## Format Guide

- **Original (.ts)**: Faster download, larger file, good compatibility
- **MP4**: Smaller file, better compatibility, extra conversion time

## FAQ

<details>
  <summary>Why does the download fail?</summary>

  Possible causes:
  - The video URL has expired
  - Cross-origin restrictions on the video
  - Unstable network connection
  - Outdated browser version

  Solutions:
  - Verify the URL is accessible
  - Try a different browser
  - Check the browser console for errors
</details>

<details>
  <summary>Safari cannot use stream download?</summary>

  Safari does not support the Streams API `WritableStream`. The tool automatically falls back to normal download. Use Chrome, Edge, or Firefox for the best experience.
</details>

<details>
  <summary>How to download specific segments?</summary>

  1. After parsing, adjust the range slider
  2. Set the start and end segment numbers
  3. Click the download button
  4. Only the selected range will be downloaded
</details>

<details>
  <summary>What if the download gets interrupted?</summary>

  - Use the Pause / Resume button to continue
  - Click red (failed) segments to retry individually
  - Auto-retry runs every 2 seconds with exponential backoff
  - Click "Download completed segments" to save partial content
</details>

## Browser Support

- **Basic features**: All modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Stream download**: Chrome 90+, Edge 90+, Firefox 88+ (Safari not supported)
- **Recommended**: Chrome / Edge for the best experience

## Privacy

- All video processing is done locally in the browser
- No data is uploaded to any server
- No download links are logged or stored
- Open source and auditable
- No registration or login required

## License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
