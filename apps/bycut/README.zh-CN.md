# ByCut

[English](./README.md)

开源浏览器端视频编辑器 —— 免费的 CapCut 替代方案。无需安装，无需上传，所有处理均在浏览器本地完成。

> 所有视频处理均在浏览器本地完成，不会上传任何数据到服务器。

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
  - 实时预览

- **用户体验**
  - GPU 加速画布渲染
  - 自定义键盘快捷键
  - 国际化支持（中文 / 英文）
  - 深色 / 浅色主题
  - 响应式编辑器布局

## 技术栈

- **框架**：Next.js（App Router，静态导出）
- **状态管理**：Zustand
- **视频处理**：FFmpeg.wasm
- **AI**：Hugging Face Transformers
- **音频**：WaveSurfer.js
- **国际化**：next-intl（中/英）

## 隐私声明

- 所有视频处理均在浏览器本地完成
- 不会上传任何数据到服务器
- 无需注册或登录
- 开源可审计

## 许可证

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
