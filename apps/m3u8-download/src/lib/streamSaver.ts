// lib/streamSaver.ts

/**
 * StreamSaver - 流式文件下载库
 * 支持大文件流式下载，避免内存溢出
 */

// ============================================================
// Types
// ============================================================

interface StreamSaverConfig {
  middleTransporterUrl: string
  useBlobFallback: boolean
}

interface MiddleTransporter {
  frame?: Window | null
  loaded: boolean
  isIframe: boolean
  isPopup: boolean
  postMessage: (...args: any[]) => void
  remove: () => void
  dispatchEvent?: (...args: any[]) => boolean
  addEventListener?: (...args: any[]) => void
  removeEventListener?: (...args: any[]) => void
}

interface TransportResponse {
  transferringReadable: boolean
  pathname: string
  headers: {
    'Content-Type': string
    'Content-Disposition': string
  }
}

// ============================================================
// Global Types
// ============================================================

declare global {
  interface Window {
    streamSaver?: {
      createWriteStream: (filename: string) => WritableStream<Uint8Array>
      middleTransporterUrl: string
      useBlobFallback: boolean
    }
  }
}

// ============================================================
// Module Variables
// ============================================================

let downloadStrategy: 'iframe' | 'navigate'
let middleTransporter: MiddleTransporter | null = null
let useBlobFallback: boolean
let isSupportTransformStream: boolean

// ============================================================
// Initialization
// ============================================================

function initialize() {
  if (typeof window === 'undefined') {
    throw new Error('StreamSaver must be used in browser environment')
  }

  // 下载策略：使用 iframe 还是 navigate
  downloadStrategy =
    window.isSecureContext || // 判断是否为 https、wss 等安全环境
    'MozAppearance' in document.documentElement.style // 是否为 Firefox 浏览器
      ? 'iframe'
      : 'navigate'

  // 检测是否需要使用 Blob 降级
  // Safari 不支持流式下载功能
  // https://github.com/jimmywarting/StreamSaver.js/issues/69
  useBlobFallback =
    /constructor/i.test(window.HTMLElement.toString()) ||
    // @ts-expect-error
    !!window.safari ||
    !!(window as any).WebKitPoint

  try {
    new Response(new ReadableStream())
    if (window.isSecureContext && !('serviceWorker' in navigator)) {
      useBlobFallback = true
    }
  } catch (err) {
    useBlobFallback = true
  }

  // 检测是否支持 TransformStream
  isSupportTransformStream = false
  try {
    const { readable } = new TransformStream()
    const messageChannel = new MessageChannel()
    messageChannel.port1.postMessage(readable, [readable as any])
    messageChannel.port1.close()
    messageChannel.port2.close()
    isSupportTransformStream = true
  } catch (err) {
    console.log('TransformStream not supported:', err)
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * 创建隐藏的 iframe 用于消息传输
 */
function makeIframe(src: string): MiddleTransporter {
  console.log('makeIframe', src)

  const iframe = document.createElement('iframe')
  iframe.hidden = true
  iframe.src = src
  iframe.name = 'streamSaver-iframe'

  const transporter: MiddleTransporter = {
    loaded: false,
    isIframe: true,
    isPopup: false,
    postMessage: (...args: any[]) => {
      // @ts-expect-error
      iframe.contentWindow?.postMessage(...args)
    },
    remove: () => {
      iframe.remove()
    },
  }

  iframe.addEventListener(
    'load',
    () => {
      transporter.loaded = true
    },
    { once: true },
  )

  document.body.appendChild(iframe)

  return transporter
}

/**
 * 创建弹出窗口，模拟 iframe 功能
 */
function makePopup(src: string): MiddleTransporter {
  console.log('makePopup', src)

  // 事件代理器，使用 DocumentFragment 实现消息监听
  const delegate = document.createDocumentFragment() as unknown as EventTarget

  const frame = window.open(src, 'streamSaver-popup', 'width=200,height=100')

  if (!frame) {
    throw new Error('Failed to open popup window. Please allow popups.')
  }

  const transporter: MiddleTransporter = {
    frame,
    loaded: false,
    isIframe: false,
    isPopup: true,
    remove: () => {
      frame.close()
    },
    dispatchEvent: (...args: any[]) => delegate.dispatchEvent(args[0]),
    // @ts-expect-error
    addEventListener: (...args: any[]) => delegate.addEventListener(...args),
    removeEventListener: (...args: any[]) =>
      // @ts-expect-error
      delegate.removeEventListener(...args),
    // @ts-expect-error
    postMessage: (...args: any[]) => frame.postMessage(...args),
  }

  // 监听 popup 是否就绪
  const onReady = (evt: MessageEvent) => {
    if (evt.source === frame) {
      transporter.loaded = true
      window.removeEventListener('message', onReady)
      transporter.dispatchEvent?.(new Event('load'))
    }
  }

  window.addEventListener('message', onReady)

  return transporter
}

/**
 * 编码文件名为 URL 安全格式
 */
function encodeFilename(filename: string): string {
  return encodeURIComponent(filename.replace(/\//g, ':'))
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A')
}

// ============================================================
// Main Function
// ============================================================

/**
 * 创建可写流用于文件下载
 */
function createWriteStream(filename: string): WritableStream<Uint8Array> {
  let bytesWritten = 0 // 记录已写入的文件大小
  let downloadUrl: string | null = null // 触发下载时的 URL
  let messageChannel: MessageChannel | null = null // 消息传输通道
  let transformStream: TransformStream<Uint8Array, Uint8Array> | null = null // 中间传输流
  let chunks: Uint8Array[] = [] // 用于 Blob 降级的数据块

  // 如果不使用 Blob 降级，则设置 Service Worker 通信
  if (!useBlobFallback) {
    // 创建中间传输器（iframe 或 popup）
    if (!middleTransporter) {
      const middleTransporterUrl =
        window.streamSaver?.middleTransporterUrl || '/mitm.html' // 默认路径，需要在 public 目录下

      middleTransporter = window.isSecureContext
        ? makeIframe(middleTransporterUrl)
        : makePopup(middleTransporterUrl)
    }

    messageChannel = new MessageChannel()

    // 处理文件名
    const encodedFilename = encodeFilename(filename)

    // 如果支持 TransformStream，使用流式传输
    if (isSupportTransformStream) {
      transformStream = new TransformStream<Uint8Array, Uint8Array>(
        downloadStrategy === 'iframe'
          ? undefined
          : {
              // 流处理，监听每个分片
              transform(chunk, controller) {
                if (!(chunk instanceof Uint8Array)) {
                  throw new TypeError('Can only write Uint8Arrays')
                }
                bytesWritten += chunk.length
                controller.enqueue(chunk)

                if (downloadUrl) {
                  window.location.href = downloadUrl
                  downloadUrl = null
                }
              },

              // 结束写入时调用
              flush() {
                if (downloadUrl) {
                  window.location.href = downloadUrl
                }
              },
            },
      )

      // 将可读流传递给 Service Worker
      messageChannel.port1.postMessage(
        { readableStream: transformStream.readable },
        [transformStream.readable as any],
      )
    }

    // 监听来自 Service Worker 的消息
    messageChannel.port1.onmessage = (evt: MessageEvent) => {
      if (evt.data.download) {
        // 处理下载 URL
        if (downloadStrategy === 'navigate') {
          middleTransporter?.remove()
          middleTransporter = null

          if (bytesWritten) {
            window.location.href = evt.data.download
          } else {
            downloadUrl = evt.data.download
          }
        } else {
          if (middleTransporter?.isPopup) {
            middleTransporter.remove()
            middleTransporter = null

            // Firefox 特殊处理
            if (downloadStrategy === 'iframe') {
              const url =
                window.streamSaver?.middleTransporterUrl || '/mitm.html'
              makeIframe(url)
            }
          }

          makeIframe(evt.data.download)
        }
      } else if (evt.data.abort) {
        // 终止下载
        chunks = []
        messageChannel?.port1.postMessage('abort')
        if (messageChannel) {
          messageChannel.port1.onmessage = null
          messageChannel.port1.close()
          messageChannel.port2.close()
          messageChannel = null
        }
      }
    }

    // 向中间传输器发送配置
    const response: TransportResponse = {
      transferringReadable: isSupportTransformStream,
      pathname: Math.random().toString().slice(-6) + '/' + encodedFilename,
      headers: {
        'Content-Type': 'application/octet-stream; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    }

    if (middleTransporter.loaded) {
      middleTransporter.postMessage(response, '*', [messageChannel.port2])
    } else {
      middleTransporter.addEventListener?.(
        'load',
        () => {
          middleTransporter?.postMessage(response, '*', [messageChannel!.port2])
        },
        { once: true },
      )
    }
  }

  // 如果有 TransformStream 且支持，直接返回其可写流
  if (!useBlobFallback && transformStream?.writable) {
    return transformStream.writable
  }

  // 否则创建自定义 WritableStream
  return new WritableStream<Uint8Array>({
    // 写入数据
    write(chunk: Uint8Array) {
      if (!(chunk instanceof Uint8Array)) {
        throw new TypeError('Can only write Uint8Arrays')
      }

      // 使用 Blob 降级方案
      if (useBlobFallback) {
        chunks.push(chunk)
        return
      }

      // 通过 MessageChannel 传输数据
      messageChannel?.port1.postMessage(chunk)
      bytesWritten += chunk.length

      if (downloadUrl) {
        window.location.href = downloadUrl
        downloadUrl = null
      }
    },

    // 关闭写入流
    close() {
      if (useBlobFallback) {
        // Blob 降级方案：创建 Blob 并触发下载
        // @ts-expect-error
        const blob = new Blob(chunks, {
          type: 'application/octet-stream; charset=utf-8',
        })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()

        // 清理
        setTimeout(() => {
          URL.revokeObjectURL(link.href)
        }, 100)
      } else {
        // Service Worker 方案：发送结束信号
        messageChannel?.port1.postMessage('end')
      }
    },

    // 中断下载
    abort() {
      chunks = []
      if (messageChannel) {
        messageChannel.port1.postMessage('abort')
        messageChannel.port1.onmessage = null
        messageChannel.port1.close()
        messageChannel.port2.close()
        messageChannel = null
      }
    },
  })
}

// ============================================================
// Export
// ============================================================

/**
 * 安装 StreamSaver 到 window 对象
 */
export function setupStreamSaver(
  middleTransporterUrl = '/mitm.html',
): StreamSaverConfig {
  if (typeof window === 'undefined') {
    throw new Error('StreamSaver can only be used in browser environment')
  }

  // 初始化
  initialize()

  // 挂载到 window
  window.streamSaver = {
    createWriteStream,
    middleTransporterUrl,
    useBlobFallback,
  }

  return {
    middleTransporterUrl,
    useBlobFallback,
  }
}

/**
 * 获取 StreamSaver 实例
 */
export function getStreamSaver() {
  if (typeof window === 'undefined') {
    return null
  }
  return window.streamSaver
}

// 默认导出
export default {
  setup: setupStreamSaver,
  get: getStreamSaver,
}
