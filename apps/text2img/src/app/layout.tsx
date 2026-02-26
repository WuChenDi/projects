/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClientProviders } from '@/components/layout/client-providers'
import '@cdlab996/ui/globals.css'

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
  title: 'AI文生图在线工具 | 基于 Cloudflare AI 的免费图像生成服务',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  description:
    '免费的在线AI文生图工具，基于 Cloudflare Workers AI，支持 FLUX.1、Stable Diffusion XL 等多种模型。无需注册，即刻使用，快速生成高质量AI图像。',
  keywords: [
    'AI文生图',
    'AI绘画',
    'AI图像生成',
    'Text to Image',
    'Stable Diffusion',
    'FLUX.1',
    'Cloudflare AI',
    '在线AI绘图',
    '免费AI生成',
    'AI艺术创作',
    'Prompt 生成',
    '人工智能绘画',
    'Stable Diffusion XL',
    'DreamShaper',
    'AI图片制作',
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
  creator: 'wudi',
  publisher: 'AI文生图服务',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  metadataBase: new URL('https://text2img.cdlab.workers.dev/'),
  alternates: {
    canonical: '/',
  },
  applicationName: 'AI文生图在线工具',
  category: 'AI Tools, Image Generation, Creative Tools',
  classification: 'AI Tools, Image Generation Software, Creative Applications',
  openGraph: {
    title: 'AI文生图在线工具 | 基于 Cloudflare AI 的免费图像生成',
    description:
      '免费的在线AI文生图工具，支持 FLUX.1、Stable Diffusion XL 等多种先进模型。无需注册，即刻体验高质量AI图像生成。',
    url: 'https://text2img.cdlab.workers.dev/',
    siteName: 'AI文生图服务',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png',
        width: 1200,
        height: 630,
        alt: 'AI文生图工具界面预览',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI文生图在线工具 | 基于 Cloudflare AI',
    description:
      '免费的在线AI文生图工具，支持多种先进AI模型，即刻体验高质量图像生成。',
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png',
    ],
    creator: '@wuchendi96',
    site: '@wuchendi96',
  },
  other: {
    'revisit-after': '3 days',
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
              name: 'AI文生图在线工具',
              url: 'https://text2img.cdlab.workers.dev/',
              description:
                '基于 Cloudflare AI 的免费在线文生图工具，支持多种先进AI模型',
              inLanguage: 'zh-CN',
              potentialAction: {
                '@type': 'SearchAction',
                target:
                  'https://text2img.cdlab.workers.dev/?q={search_term_string}',
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
              name: 'AI文生图在线工具',
              description:
                '强大的在线AI文生图工具，基于 Cloudflare Workers AI，支持 FLUX.1 schnell、Stable Diffusion XL、DreamShaper 等多种先进模型。提供随机提示词、参数调节、图像下载等完整功能。',
              url: 'https://text2img.cdlab.workers.dev/',
              applicationCategory: 'MultimediaApplication',
              operatingSystem: 'Web',
              browserRequirements:
                'Requires JavaScript enabled. Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
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
                name: 'AI文生图服务',
                url: 'https://text2img.cdlab.workers.dev/',
              },
              datePublished: '2025-01-01',
              dateModified: new Date().toISOString().split('T')[0],
              inLanguage: 'zh-CN',
              isAccessibleForFree: true,
              keywords:
                'AI文生图, AI绘画, Stable Diffusion, FLUX.1, Cloudflare AI, 文本生成图像, 在线AI工具',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/text2img/index.png',
                description: 'AI文生图工具界面截图',
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
                '支持多种AI模型（FLUX.1, Stable Diffusion XL, DreamShaper等）',
                '完全免费使用',
                '无需注册登录',
                '提供随机提示词库',
                '高级参数自定义',
                '图像尺寸调节（256-2048px）',
                '迭代步数控制',
                '引导系数调整',
                '随机种子设置',
                '一键下载生成图像',
                '参数复制功能',
                '深色/浅色主题切换',
                '响应式设计支持移动端',
              ],
              interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: { '@type': 'http://schema.org/UseAction' },
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
                  item: 'https://text2img.cdlab.workers.dev/',
                },
              ],
            }),
          }}
        />

        {/* JSON-LD Structured Data - SoftwareApplication (额外优化) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'AI文生图在线工具',
              applicationCategory: 'DesignApplication',
              operatingSystem: 'Any',
              offers: {
                '@type': 'Offer',
                price: '0',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '200',
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          {children}
          <Toaster richColors position="top-center" duration={3000} />
        </ClientProviders>
      </body>
    </html>
  )
}
