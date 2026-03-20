/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import type { Locale } from 'next-intl'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server'

import '@cdlab996/ui/globals.css'
import './globals.css'
import { ClientProviders } from '@/components/layout'
import { routing } from '@/i18n/routing'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  if (locale === 'zh') {
    return {
      title: 'ByCut - 开源浏览器视频编辑器 | AI 驱动的免费剪辑工具',
      description:
        '基于浏览器的开源视频编辑器，支持 AI 智能剪辑、时间轴编辑、字幕生成、文字转语音、角色管理等功能。完全免费，无需安装，数据本地处理保护隐私。',
      keywords: [
        '视频编辑器',
        '在线剪辑',
        '浏览器视频编辑',
        'AI 视频剪辑',
        '开源视频编辑器',
        '免费视频编辑',
        '字幕生成',
        '文字转语音',
        '时间轴编辑',
        '本地视频处理',
        'CapCut 替代',
        '剪映替代',
      ],
      referrer: 'no-referrer-when-downgrade',
      authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
      creator: 'wudi',
      publisher: 'ByCut',
      robots: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
      metadataBase: new URL('https://bycut.pages.dev/'),
      alternates: {
        canonical: '/',
        languages: { en: '/en', zh: '/zh' },
      },
      applicationName: 'ByCut',
      icons: 'https://notes-wudi.pages.dev/images/logo.png',
      openGraph: {
        title: 'ByCut - 开源浏览器视频编辑器 | AI 驱动的免费剪辑工具',
        description:
          '基于浏览器的开源视频编辑器，支持 AI 智能剪辑、时间轴编辑、字幕生成、文字转语音等功能。完全免费，数据本地处理保护隐私。',
        url: 'https://bycut.pages.dev/',
        siteName: 'ByCut',
        images: [
          {
            url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png',
            width: 1200,
            height: 630,
            alt: 'ByCut 视频编辑器界面预览',
          },
        ],
        locale: 'zh_CN',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'ByCut - 开源浏览器视频编辑器 | AI 驱动的免费剪辑工具',
        description:
          '基于浏览器的开源视频编辑器，支持 AI 智能剪辑、时间轴编辑、字幕生成、文字转语音等功能。完全免费，数据本地处理保护隐私。',
        images: [
          'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png',
        ],
        creator: '@wuchendi96',
        site: '@wuchendi96',
      },
      appleWebApp: {
        capable: true,
        title: 'ByCut',
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
  }

  return {
    title: 'ByCut - Open Source Browser Video Editor | AI-Powered Free Editing',
    description:
      'Open-source browser-based video editor with AI-powered editing, timeline editing, caption generation, text-to-speech, character management and more. Completely free, no installation needed, all data processed locally for privacy.',
    keywords: [
      'video editor',
      'online video editor',
      'browser video editor',
      'AI video editing',
      'open source video editor',
      'free video editor',
      'caption generation',
      'text to speech',
      'timeline editor',
      'local video processing',
      'CapCut alternative',
      'privacy-focused video editor',
    ],
    referrer: 'no-referrer-when-downgrade',
    authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
    creator: 'wudi',
    publisher: 'ByCut',
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
    metadataBase: new URL('https://bycut.pages.dev/'),
    alternates: {
      canonical: '/',
      languages: { en: '/en', zh: '/zh' },
    },
    applicationName: 'ByCut',
    category: 'Video Editor, Multimedia, AI Tools',
    classification: 'Video Editor, Multimedia, AI Tools',
    icons: 'https://notes-wudi.pages.dev/images/logo.png',
    openGraph: {
      title:
        'ByCut - Open Source Browser Video Editor | AI-Powered Free Editing',
      description:
        'Open-source browser-based video editor with AI-powered editing, timeline editing, caption generation, text-to-speech and more. Free, private, no installation.',
      url: 'https://bycut.pages.dev/',
      siteName: 'ByCut',
      images: [
        {
          url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png',
          width: 1200,
          height: 630,
          alt: 'ByCut video editor interface preview',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title:
        'ByCut - Open Source Browser Video Editor | AI-Powered Free Editing',
      description:
        'Open-source browser-based video editor with AI-powered editing, timeline editing, caption generation, text-to-speech and more. Free, private, no installation.',
      images: [
        'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png',
      ],
      creator: '@wuchendi96',
      site: '@wuchendi96',
    },
    appleWebApp: {
      capable: true,
      title: 'ByCut',
    },
    other: {
      'revisit-after': '7 days',
      distribution: 'global',
      rating: 'general',
      copyright: '© 2025 wudi. All rights reserved.',
      language: 'en',
      googlebot: 'index, follow',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Enable static rendering
  setRequestLocale(locale)

  // Providing all messages to the client side
  const messages = await getMessages()
  const t = await getTranslations()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* JSON-LD: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'ByCut',
              url: 'https://bycut.pages.dev/',
              description:
                locale === 'zh'
                  ? '基于浏览器的开源视频编辑器，支持 AI 智能剪辑、时间轴编辑、字幕生成等功能。'
                  : 'Open-source browser-based video editor with AI-powered editing, timeline editing, caption generation and more.',
              inLanguage: locale,
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://bycut.pages.dev/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />

        {/* JSON-LD: WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'ByCut',
              description:
                locale === 'zh'
                  ? '基于浏览器的开源视频编辑器，支持 AI 智能剪辑、时间轴编辑、字幕生成、文字转语音、角色管理等功能。完全免费，数据本地处理保护隐私。'
                  : 'Open-source browser-based video editor with AI-powered editing, timeline editing, caption generation, text-to-speech, character management and more. Completely free, all data processed locally for privacy.',
              url: 'https://bycut.pages.dev/',
              applicationCategory: 'MultimediaApplication',
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
                name: 'wudi',
                url: 'https://github.com/WuChenDi',
              },
              publisher: {
                '@type': 'Organization',
                name: 'ByCut',
                url: 'https://bycut.pages.dev/',
              },
              datePublished: '2024-01-01',
              dateModified: '2025-11-04',
              inLanguage: locale,
              isAccessibleForFree: true,
              keywords:
                locale === 'zh'
                  ? '视频编辑器, AI 视频剪辑, 在线剪辑, 字幕生成, 文字转语音, 时间轴编辑, 开源'
                  : 'video editor, AI video editing, online editor, caption generation, text-to-speech, timeline editing, open source',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/ByCut/index.png',
                description:
                  locale === 'zh'
                    ? 'ByCut 视频编辑器界面截图'
                    : 'ByCut video editor interface screenshot',
              },
              softwareVersion: '1.0.0',
              featureList: [
                'AI-powered video editing agent',
                'Timeline-based multi-track editing',
                'Caption/subtitle generation',
                'Text-to-speech synthesis',
                'AI character management',
                'AI image and video generation',
                'Sticker and transition effects',
                'Local browser processing - no uploads',
                'Privacy-focused - all data stays on your device',
                'Free to use, no registration required',
              ],
              sameAs: [
                'https://github.com/WuChenDi',
                'https://x.com/wuchendi96',
              ],
            }),
          }}
        />

        {/* JSON-LD: BreadcrumbList */}
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
                  name: locale === 'zh' ? '首页' : 'Home',
                  item: 'https://bycut.pages.dev/',
                },
              ],
            }),
          }}
        />

        {/* JSON-LD: SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'ByCut',
              applicationCategory: 'MultimediaApplication',
              offers: {
                '@type': 'Offer',
                price: '0',
              },
              operatingSystem: 'Any',
              permissions: 'Browser access only',
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            {children}
            <Toaster richColors position="top-center" duration={3000} />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
