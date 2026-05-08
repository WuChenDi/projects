# byplay

[English](./README.md) | [中文](./README.zh-CN.md)

在线视频播放器，支持 HLS（M3U8 自适应码率）、MP4、WebM、OGG 等多种格式。

> 所有视频处理均在浏览器本地完成，不会上传任何数据到服务器。

预览：https://byplay.pages.dev/

![](https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png)

## 功能特性

- **多格式播放**
  - 通过 hls.js 播放 HLS/M3U8，支持自适应码率
  - 直接播放 MP4、WebM、OGG、MOV、MKV 等格式
  - 自动检测格式——非 HLS 视频时自动隐藏 HLS 配置面板

- **HLS 控制**
  - 手动切换画质等级或启用自动 ABR
  - 可配置缓冲区、ABR、性能及重试参数
  - 实时统计：带宽、已缓冲时长、丢帧数、当前等级

- **通用播放**
  - 可调节播放速度（0.25x – 4x）
  - 自动播放开关
  - 事件日志，便于调试

- **广告过滤**
  - 基于 M3U8 manifest/level 加载器的分片剔除
  - 四种过滤模式：关闭 / 关键字 / 启发式 / 激进
  - 自定义关键字列表

- **跨工具集成**
  - 一键跳转到 [vidl](https://vidl.pages.dev/) 下载当前视频
  - 切换页面时保留语言设置（中/英）

## 许可证

[MIT](./LICENSE) License &copy; 2025-PRESENT [wudi](https://github.com/WuChenDi)
