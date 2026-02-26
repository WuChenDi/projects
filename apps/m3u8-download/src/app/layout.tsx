/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import '@cdlab996/ui/globals.css'
import { ClientProviders, Header } from '@/components/layout'

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
  title: 'M3U8 在线下载工具 | 支持范围下载、流式下载、AES 解密',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  description:
    'M3U8 在线下载工具，支持范围下载、流式下载、AES-128 解密、转 MP4 格式。完全免费，无需注册，浏览器端处理，保护隐私。',
  keywords: [
    'M3U8下载',
    'M3U8下载器',
    'HLS下载',
    '视频下载',
    'TS合并',
    'MP4转换',
    'AES解密',
    '流式下载',
    '范围下载',
    '在线工具',
    'M3U8 downloader',
    'HLS video download',
    '视频片段下载',
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
  creator: 'wudi',
  publisher: 'M3U8 Download Tool',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  metadataBase: new URL('https://m3u8dw.pages.dev/'),
  alternates: {
    canonical: '/',
  },
  applicationName: 'M3U8 在线下载工具',
  category: 'Video Tools, Download Tools, Media Tools',
  classification: 'Video Download Tools, Media Processing, Streaming Tools',
  openGraph: {
    title: 'M3U8 在线下载工具 - 支持范围下载、流式下载、AES 解密',
    description:
      '强大的 M3U8 在线下载工具，支持范围下载、流式下载、AES-128 解密、转 MP4 格式。完全免费，浏览器端处理，保护隐私。',
    url: 'https://m3u8dw.pages.dev/',
    siteName: 'M3U8 Download Tool',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/m3u8dw/index.png',
        width: 1200,
        height: 630,
        alt: 'M3U8 在线下载工具界面预览',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'M3U8 在线下载工具 - 支持范围下载、流式下载、AES 解密',
    description:
      '强大的 M3U8 在线下载工具，支持范围下载、流式下载、AES-128 解密、转 MP4 格式。完全免费，浏览器端处理。',
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/m3u8dw/index.png',
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
              name: 'M3U8 在线下载工具',
              url: 'https://m3u8dw.pages.dev/',
              description:
                'M3U8 在线下载工具，支持范围下载、流式下载、AES-128 解密、转 MP4 格式',
              inLanguage: 'zh-CN',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://m3u8dw.pages.dev/?q={search_term_string}',
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
              name: 'M3U8 在线下载工具',
              description:
                '强大的 M3U8/HLS 视频下载工具，支持范围下载、流式下载、AES-128 解密、TS 合并、MP4 转换。完全免费，浏览器端处理。',
              url: 'https://m3u8dw.pages.dev/',
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
                url: 'https://m3u8dw.pages.dev/',
              },
              datePublished: '2023-01-01',
              dateModified: '2025-02-13',
              inLanguage: 'zh-CN',
              isAccessibleForFree: true,
              keywords:
                'M3U8下载, HLS下载, 视频下载, TS合并, MP4转换, AES解密, 流式下载',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/m3u8dw/index.png',
                description: 'M3U8 下载工具界面截图',
              },
              softwareVersion: '2.0.0',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '280',
                bestRating: '5',
                worstRating: '1',
              },
              featureList: [
                '支持 M3U8/HLS 视频下载',
                '范围下载（选择片段区间）',
                '流式下载（低内存占用）',
                'AES-128 解密支持',
                'TS 文件合并',
                'MP4 格式转换',
                '断点续传',
                '批量下载',
                '进度实时显示',
                '浏览器端处理',
                '完全免费',
              ],
              interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: { '@type': 'http://schema.org/UseAction' },
                userInteractionCount: 12000,
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
                  item: 'https://m3u8dw.pages.dev/',
                },
              ],
            }),
          }}
        />

        {/* JSON-LD Structured Data - SoftwareApplication (额外) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'M3U8 在线下载工具',
              applicationCategory: 'UtilitiesApplication',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '280',
              },
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'CNY',
              },
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
          <Toaster richColors position="top-center" duration={3000} />
        </ClientProviders>
      </body>
    </html>
  )
}
