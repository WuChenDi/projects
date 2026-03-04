# 🚀 Clearify

Powerful web-based tools for your image editing needs

> ⚠️ All images are processed locally on your device and are not uploaded to any server.

Preview: https://clearify.pages.dev/

<details>
  <summary>🔍 Preview</summary>
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/index.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/bg-pages.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/squish-pages.png" />
  <img src="https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/compress-pages.png" />
</details>

## ✨ Features

- 🖼️ **Remove Image Background**
  - 🎯 One-click background removal
  - 🎨 Replace background with a color or custom image
  - 💾 Export with transparency or filled background
  - 🏃‍♂️ Runs fully in the browser (no uploads)
  - 🔒 Privacy-focused
  - ⚡ Optional WebGPU acceleration

  > **Models:**
  >
  > - [MODNet (WebGPU)](https://huggingface.co/wuchendi/MODNet)
  > - [RMBG-2.0 (WASM)](https://huggingface.co/briaai/RMBG-2.0)
  > - [RMBG-1.4 (WASM)](https://huggingface.co/briaai/RMBG-1.4)
  >
  > Powered by [Transformers.js](https://www.npmjs.com/package/@huggingface/transformers)

- 🗜️ **Squish - Batch Image Compression**
  - 🚀 Batch compress multiple images in the browser
  - 📏 Supports multiple formats: AVIF, JPEG, JXL, PNG, WebP
  - 🎚️ Adjustable quality settings (1-100%)
  - ⚡ High-performance compression using WebAssembly
  - 📥 Drag-and-drop or paste image support
  - 💾 Download optimized images individually or in bulk
  - 🔒 Local processing ensures privacy
  - 🌐 Intuitive interface with real-time preview

  > **Technologies:**
  >
  > - Powered by WebAssembly for efficient compression
  > - Compatible with modern browser APIs

- 🎥 **Video Compressor**
  - 🚀 Compress videos up to 90% in your browser
  - 🎨 Multiple compression methods: CRF, bitrate, percentage, filesize
  - 🎚️ Customizable video and audio settings
  - 📏 Supports H.264/H.265 video codecs and AAC/MP3 audio
  - 📈 Real-time progress visualization
  - 🔒 Privacy-focused - no uploads required
  - 🌐 Modern UI with drag-and-drop support

  > **Technologies:**
  >
  > - Powered by FFmpeg.js for efficient video processing
  > - Browser-based processing with WebAssembly
  > - Real-time progress tracking and preview

## 🌐 Browser Support

- **Default Experience**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Enhanced Experience**: Available in browsers with `WebGPU` support

## 📜 License

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
