/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import '@cdlab996/ui/globals.css'
import { ClientProviders, Footer, Header } from '@/components/layout'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// --- SEO Metadata ---
export const metadata: Metadata = {
  title: '在线视频播放器 - 支持MP4、M3U8、FLV等多种格式 | ByPlay',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  description:
    '功能强大的在线视频播放器，支持MP4、M3U8、FLV等多种视频格式，提供超低延迟播放、倍速控制、实时跳转等高级功能。免费、无需注册、即开即用。',
  keywords: [
    '视频播放器',
    '在线播放器',
    'MP4播放器',
    'M3U8播放器',
    'FLV播放器',
    'HTML5视频',
    '流媒体播放',
    '低延迟播放',
    '视频工具',
    'Web播放器',
    '直播播放器',
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
  creator: 'wudi',
  publisher: 'ByPlay',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  metadataBase: new URL('https://byplay.pages.dev/'),
  alternates: {
    canonical: '/',
  },
  applicationName: 'Web Video Player',
  category: 'Media Player, Video Tools, Streaming Technology',
  classification: 'Media Player, Video Tools, Streaming Technology',
  openGraph: {
    title: '在线视频播放器 - 支持HLS、FLV、MP4等多种格式',
    description:
      '功能强大的在线视频播放器，支持MP4、M3U8、FLV等多种视频格式，提供超低延迟播放、倍速控制、实时跳转等高级功能。',
    url: 'https://byplay.pages.dev/',
    siteName: 'Web Video Player',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Web Video Player 界面预览',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '在线视频播放器 - 支持MP4、M3U8、FLV等多种格式',
    description:
      '功能强大的在线视频播放器，支持MP4、M3U8、FLV等多种视频格式，提供超低延迟播放、倍速控制、实时跳转等高级功能。',
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png',
    ],
    creator: '@wuchendi96',
    site: '@wuchendi96',
  },
  other: {
    'revisit-after': '7 days',
    distribution: 'global',
    rating: 'general',
    copyright: '© 2025 wudi. All rights reserved.',
    language: 'zh-CN',
    googlebot: 'index, follow',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* JSON-LD Structured Data - Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Web Video Player',
              url: 'https://byplay.pages.dev/',
              description:
                '功能强大的在线视频播放器，支持MP4、M3U8、FLV等多种视频格式',
              inLanguage: 'zh-CN',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://byplay.pages.dev/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />

        {/* JSON-LD Structured Data - WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Web Video Player',
              description:
                '功能强大的在线视频播放器，支持MP4、M3U8、FLV等多种视频格式，提供超低延迟播放、倍速控制、实时跳转等高级功能。',
              url: 'https://byplay.pages.dev/',
              applicationCategory: 'MultimediaApplication',
              operatingSystem: 'Web',
              browserRequirements:
                '需要启用 JavaScript。兼容 Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'CNY',
                availability: 'https://schema.org/InStock',
              },
              author: {
                '@type': 'Person',
                name: 'wudi',
                url: 'https://github.com/WuChenDi',
              },
              publisher: {
                '@type': 'Organization',
                name: 'wudi',
                url: 'https://byplay.pages.dev/',
              },
              datePublished: '2023-01-01',
              dateModified: '2025-10-07',
              inLanguage: 'zh-CN',
              isAccessibleForFree: true,
              keywords:
                '视频播放器, MP4播放, M3U8播放, FLV播放, 流媒体, 超低延迟, 倍速播放, 在线工具',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png',
                description: 'Web Video Player 界面截图',
              },
              softwareVersion: '1.0.0',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '200',
                bestRating: '5',
                worstRating: '1',
              },
              featureList: [
                '支持 MP4、M3U8、FLV 等多种视频格式',
                '超低延迟播放技术',
                '可调节播放倍速（0-16倍）',
                '精确时间点跳转',
                '高级负载策略配置',
                '响应式设计，适配所有设备',
                '免费使用，无需注册',
              ],
              interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: {
                  '@type': 'http://schema.org/ViewAction',
                },
                userInteractionCount: 10000,
              },
              sameAs: [
                'https://github.com/WuChenDi',
                'https://x.com/wuchendi96',
              ],
            }),
          }}
        />

        {/* JSON-LD Structured Data - BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: '首页',
                  item: 'https://byplay.pages.dev/',
                },
              ],
            }),
          }}
        />

        {/* JSON-LD Structured Data - SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Web Video Player',
              applicationCategory: 'MultimediaApplication',
              offers: {
                '@type': 'Offer',
                price: '0',
              },
              operatingSystem: 'Any',
              permissions: '浏览器访问权限',
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          <Header />
          {children}
          <Footer />
          <Toaster richColors position="top-center" duration={3000} />
        </ClientProviders>
      </body>
    </html>
  )
}
