/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import '@cdlab/ui/globals.css'

import { Toaster } from '@cdlab/ui/components/sonner'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { ClientProviders } from '@/components/layout'

const SITE_NAME = 'WePush'
const SITE_TITLE = 'WePush - 微信公众号定时推送控制台'
const SITE_DESCRIPTION =
  '微信公众号模板消息定时推送管理平台，支持多用户、多模板配置，可视化日志查看，轻松管理公众号消息推送任务。'
const SITE_URL = 'https://wepush.cdlab.workers.dev/'
const SITE_IMAGE =
  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/wepush/index.png'
const AUTHOR = {
  name: 'wudi',
  url: 'https://github.com/WuChenDi',
}
const KEYWORDS = [
  '微信公众号',
  '模板消息',
  '定时推送',
  '消息推送',
  '微信推送',
  '公众号管理',
  'WeChat',
  'WeChatMP',
  'template message',
  'scheduled push',
  'Next.js',
  'Cloudflare',
]

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  keywords: KEYWORDS,
  category: 'productivity',
  referrer: 'no-referrer-when-downgrade',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_IMAGE, alt: SITE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@wuchendi96',
    creator: '@wuchendi96',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    'revisit-after': '7 days',
    distribution: 'global',
    rating: 'general',
    copyright: '© 2026 wudi. All rights reserved.',
    language: 'zh-CN',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'zh-CN',
  author: {
    '@type': 'Person',
    name: AUTHOR.name,
    url: AUTHOR.url,
  },
}

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  browserRequirements:
    'Requires JavaScript. Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  author: {
    '@type': 'Person',
    name: AUTHOR.name,
    url: AUTHOR.url,
  },
  inLanguage: 'zh-CN',
  isAccessibleForFree: true,
}

function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(webAppJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders>
          {children}
          <Toaster richColors position="top-right" />
        </ClientProviders>
      </body>
    </html>
  )
}
