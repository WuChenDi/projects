// app/mitm/page.tsx
'use client'

import { useEffect, useRef } from 'react'

export default function MitmPage() {
  const serviceWorkerRef = useRef<ServiceWorker | null>(null)
  const scopeRef = useRef<string>('')
  const tempMessageStoreRef = useRef<MessageEvent[]>([])

  useEffect(() => {
    // 保活函数
    let keepAliveInterval: NodeJS.Timeout | null = null
    const keepAlive = () => {
      if (keepAliveInterval) return // 防止重复调用

      const ping =
        window.location.href.substring(
          0,
          window.location.href.lastIndexOf('/'),
        ) + '/ping'

      keepAliveInterval = setInterval(() => {
        if (serviceWorkerRef.current) {
          serviceWorkerRef.current.postMessage('ping')
        } else {
          fetch(ping)
            .then((res) => {
              if (!res.ok) {
                if (keepAliveInterval) {
                  clearInterval(keepAliveInterval)
                }
              }
              return res.text()
            })
            .catch(() => {
              // 忽略错误
            })
        }
      }, 10000)
    }

    // 注册 Service Worker
    const registerWorker = async () => {
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

        scopeRef.current = registration.scope

        // 如果已激活，直接使用
        if (registration.active) {
          serviceWorkerRef.current = registration.active
          return
        }

        // 等待激活
        const swRegTmp = registration.installing || registration.waiting
        if (swRegTmp) {
          await new Promise<void>((resolve) => {
            const onStateChange = () => {
              if (swRegTmp.state === 'activated') {
                swRegTmp.removeEventListener('statechange', onStateChange)
                serviceWorkerRef.current = registration!.active
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

    // 消息处理函数
    const onMessage = (event: MessageEvent) => {
      const { data, ports, origin } = event

      console.log('onMessage', event)

      // 验证消息通道
      if (!ports || !ports.length) {
        console.error("[StreamSaver] You didn't send a messageChannel")
        return
      }

      // 验证数据
      if (typeof data !== 'object') {
        console.error("[StreamSaver] You didn't send an object")
        return
      }

      // 警告：readableStream 应该通过 messageChannel 发送
      if (data.readableStream) {
        console.warn(
          '[StreamSaver] You should send the readableStream in the messageChannel, not through mitm',
        )
      }

      // 处理 pathname
      if (!data.pathname) {
        console.warn('[StreamSaver] Please send `data.pathname`')
        data.pathname =
          Math.random().toString().slice(-6) +
          '/' +
          (data.filename || 'download')
      }

      // 验证 headers
      if (!data.headers) {
        console.warn(
          '[StreamSaver] pass `data.headers` that you would like to pass along to the service worker',
        )
      } else {
        try {
          new Headers(data.headers)
        } catch (error) {
          console.error('[StreamSaver] Invalid headers:', error)
          return
        }
      }

      // 设置元数据
      data.origin = origin
      data.referrer = data.referrer || document.referrer || origin

      // 删除前导斜杠
      data.pathname = data.pathname.replace(/^\/+/g, '')

      // 去除协议
      const org = origin.replace(/(^\w+:|^)\/\//, '')

      // 设置下载 URL
      data.url = new URL(
        `${scopeRef.current}${org}/${data.pathname}`,
      ).toString()

      // 验证路径
      if (!data.url.startsWith(`${scopeRef.current}${org}/`)) {
        console.error('[StreamSaver] bad `data.pathname`')
        return
      }

      // 准备可传输对象
      const transferable = data.readableStream
        ? [ports[0], data.readableStream]
        : [ports[0]]

      // 如果没有流式传输，启动保活
      if (!(data.readableStream || data.transferringReadable)) {
        keepAlive()
      }

      // 发送消息给 Service Worker
      if (serviceWorkerRef.current) {
        serviceWorkerRef.current.postMessage(data, transferable)
      }
    }

    // 临时存储消息（在 SW 就绪前）
    const tempMessageHandler = (evt: MessageEvent) => {
      tempMessageStoreRef.current.push(evt)
    }

    window.addEventListener('message', tempMessageHandler)

    // 注册 Service Worker 并处理消息
    registerWorker().then(() => {
      // 移除临时处理器
      window.removeEventListener('message', tempMessageHandler)

      // 添加正式处理器
      window.addEventListener('message', onMessage)

      // 处理临时存储的消息
      tempMessageStoreRef.current.forEach((evt) => onMessage(evt))
      tempMessageStoreRef.current = []

      // 通知父窗口已就绪（用于 popup 模式）
      if (window.opener) {
        window.opener.postMessage('StreamSaver::loadedPopup', '*')
      }
    })

    // 清理函数
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('message', tempMessageHandler)
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
      }
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4" />
        <p className="text-gray-600">StreamSaver Service Worker</p>
        <p className="text-sm text-gray-400 mt-2">
          This page is used for stream downloading
        </p>
      </div>
    </div>
  )
}
