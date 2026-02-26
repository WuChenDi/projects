interface MitmData {
  pathname?: string
  filename?: string
  headers?: HeadersInit
  readableStream?: ReadableStream
  transferringReadable?: boolean
  origin?: string
  referrer?: string
  url?: string
}

let serviceWorker: ServiceWorker | null = null
let scope = ''
let keepAliveInterval: NodeJS.Timeout | null = null

/**
 * 保活函数 - 防止 Service Worker 被回收
 */
function keepAlive() {
  if (keepAliveInterval) return // 防止重复调用

  const ping =
    location.href.substring(0, location.href.lastIndexOf('/')) + '/ping'

  keepAliveInterval = setInterval(() => {
    if (serviceWorker) {
      serviceWorker.postMessage('ping')
    } else {
      fetch(ping)
        .then((res) => {
          if (!res.ok && keepAliveInterval) {
            clearInterval(keepAliveInterval)
            keepAliveInterval = null
          }
          return res.text()
        })
        .catch(() => {
          // 忽略错误
        })
    }
  }, 10000)
}

/**
 * 注册 Service Worker
 */
async function registerWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported')
    keepAlive()
    return
  }

  try {
    // 获取或注册 Service Worker
    let registration = await navigator.serviceWorker.getRegistration('./')

    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: './',
      })
    }

    scope = registration.scope

    // 如果已激活，直接使用
    if (registration.active) {
      serviceWorker = registration.active
      return
    }

    // 等待激活
    const swRegTmp = registration.installing || registration.waiting
    if (swRegTmp) {
      await new Promise<void>((resolve) => {
        const onStateChange = () => {
          if (swRegTmp.state === 'activated') {
            swRegTmp.removeEventListener('statechange', onStateChange)
            serviceWorker = registration!.active
            resolve()
          }
        }
        swRegTmp.addEventListener('statechange', onStateChange)
      })
    }
  } catch (error) {
    console.error('Failed to register Service Worker:', error)
    keepAlive()
  }
}

/**
 * 处理来自主线程的消息
 */
function handleMessage(event: MessageEvent): void {
  const { data, ports, origin } = event

  console.log('[MITM] onMessage', event)

  // 验证消息通道
  if (!ports || !ports.length) {
    console.error("[MITM] You didn't send a messageChannel")
    return
  }

  // 验证数据
  if (typeof data !== 'object') {
    console.error("[MITM] You didn't send an object")
    return
  }

  // 处理数据
  const mitmData: MitmData = { ...data }

  // 警告：readableStream 应该通过 messageChannel 发送
  if (mitmData.readableStream) {
    console.warn(
      '[MITM] You should send the readableStream in the messageChannel, not through mitm',
    )
  }

  // 处理 pathname
  if (!mitmData.pathname) {
    console.warn(
      '[MITM] Please send `data.pathname` (eg: /pictures/summer.jpg)',
    )
    mitmData.pathname =
      Math.random().toString().slice(-6) +
      '/' +
      (mitmData.filename || 'download')
  }

  // 验证 headers
  if (!mitmData.headers) {
    console.warn(
      '[MITM] pass `data.headers` that you would like to pass along to the service worker',
    )
  } else {
    try {
      new Headers(mitmData.headers)
    } catch (error) {
      console.error('[MITM] Invalid headers:', error)
      return
    }
  }

  // 设置元数据
  mitmData.origin = origin
  mitmData.referrer = mitmData.referrer || document.referrer || origin

  // 删除前导斜杠
  mitmData.pathname = mitmData.pathname.replace(/^\/+/g, '')

  // 去除协议
  const org = origin.replace(/(^\w+:|^)\/\//, '')

  // 设置下载 URL
  mitmData.url = new URL(`${scope}${org}/${mitmData.pathname}`).toString()

  // 验证路径
  if (!mitmData.url.startsWith(`${scope}${org}/`)) {
    console.error('[MITM] bad `data.pathname`')
    return
  }

  // 准备可传输对象
  const transferable = mitmData.readableStream
    ? [ports[0], mitmData.readableStream]
    : [ports[0]]

  // 如果没有流式传输，启动保活
  if (!(mitmData.readableStream || mitmData.transferringReadable)) {
    keepAlive()
  }

  // 发送消息给 Service Worker
  if (serviceWorker) {
    serviceWorker.postMessage(mitmData, transferable as any)
  }
}

/**
 * 初始化 MITM
 * 这个函数会在 streamSaver 内部调用，不需要在 mitm.html 中使用
 */
export async function initializeMitm(): Promise<void> {
  // 注册 Service Worker
  await registerWorker()

  // 监听消息
  window.addEventListener('message', handleMessage)

  // 通知父窗口已就绪（用于 popup 模式）
  if (window.opener) {
    window.opener.postMessage('StreamSaver::loadedPopup', '*')
  }
}

/**
 * 清理函数
 */
export function cleanupMitm(): void {
  window.removeEventListener('message', handleMessage)
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
  }
}
