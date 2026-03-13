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
import { ClientProviders, Footer, Header } from '@/components/layout'
import { routing } from '@/i18n/routing'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

interface RootLayoutProps {
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
      title: 'ByPlay - 在线 HLS 播放器 | M3U8, MP4, WebM, TS 流媒体',
      icons: 'https://notes-wudi.pages.dev/images/logo.png',
      description:
        '基于 hls.js 的免费在线 HLS 流媒体播放器。支持 M3U8、MP4、WebM、OGG、TS、MPD 格式。具备自适应码率 (ABR)、低延迟模式、缓冲区配置、播放速率控制和画质切换功能。',
      keywords: [
        'HLS 播放器',
        'M3U8 播放器',
        '在线视频播放器',
        'hls.js',
        '流媒体播放器',
        'MP4 播放器',
        'WebM 播放器',
        '自适应码率',
        '低延迟直播',
        '网页播放器',
        'HTML5 视频',
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
      alternates: { canonical: '/' },
      applicationName: 'ByPlay',
      openGraph: {
        title: 'ByPlay - 在线 HLS 播放器 | M3U8, MP4, WebM, TS 流媒体',
        description:
          '基于 hls.js 的免费在线 HLS 流媒体播放器。支持 M3U8、MP4、WebM、TS 格式，具备自适应码率、低延迟模式、缓冲区配置和播放速率控制。',
        url: 'https://byplay.pages.dev/',
        siteName: 'ByPlay',
        images: [
          {
            url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png',
            width: 1200,
            height: 630,
            alt: 'ByPlay HLS 播放器界面预览',
          },
        ],
        locale: 'zh_CN',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'ByPlay - 在线 HLS 播放器 | M3U8, MP4, WebM, TS 流媒体',
        description:
          '基于 hls.js 的免费在线 HLS 流媒体播放器。支持 M3U8、MP4、WebM、TS 格式，具备自适应码率、低延迟模式、缓冲区配置和播放速率控制。',
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
  }

  return {
    title: 'ByPlay - Online HLS Player | M3U8, MP4, WebM, TS Streaming',
    icons: 'https://notes-wudi.pages.dev/images/logo.png',
    description:
      'Free online HLS streaming player powered by hls.js. Supports M3U8, MP4, WebM, OGG, TS, and MPD formats. Features adaptive bitrate (ABR), low-latency mode, buffer configuration, playback rate control, and quality switching.',
    keywords: [
      'HLS player',
      'M3U8 player',
      'online video player',
      'hls.js',
      'streaming player',
      'MP4 player',
      'WebM player',
      'adaptive bitrate',
      'low latency streaming',
      'web player',
      'HTML5 video',
      'live stream player',
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
    alternates: { canonical: '/' },
    applicationName: 'ByPlay',
    category: 'Media Player, Video Tools, Streaming Technology',
    classification: 'Media Player, Video Tools, Streaming Technology',
    openGraph: {
      title: 'ByPlay - Online HLS Player | M3U8, MP4, WebM, TS Streaming',
      description:
        'Free online HLS streaming player powered by hls.js. Supports M3U8, MP4, WebM, TS formats with adaptive bitrate, low-latency mode, buffer configuration, and playback rate control.',
      url: 'https://byplay.pages.dev/',
      siteName: 'ByPlay',
      images: [
        {
          url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png',
          width: 1200,
          height: 630,
          alt: 'ByPlay HLS Player interface preview',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ByPlay - Online HLS Player | M3U8, MP4, WebM, TS Streaming',
      description:
        'Free online HLS streaming player powered by hls.js. Supports M3U8, MP4, WebM, TS formats with adaptive bitrate, low-latency mode, buffer configuration, and playback rate control.',
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
      language: 'en',
      googlebot: 'index, follow',
    },
  }
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
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
    <html lang={locale}>
      <head>
        {/* JSON-LD Structured Data - Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'ByPlay',
              url: 'https://byplay.pages.dev/',
              description:
                'Online HLS streaming player powered by hls.js. Supports M3U8, MP4, WebM, and TS formats.',
              inLanguage: locale,
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
              name: 'ByPlay',
              description:
                'Free online HLS streaming player powered by hls.js. Supports M3U8, MP4, WebM, TS formats with adaptive bitrate, low-latency mode, buffer configuration, and playback rate control.',
              url: 'https://byplay.pages.dev/',
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
                name: 'wudi',
                url: 'https://byplay.pages.dev/',
              },
              datePublished: '2023-01-01',
              dateModified: '2025-10-07',
              inLanguage: locale,
              isAccessibleForFree: true,
              keywords:
                'HLS player, hls.js, M3U8 player, MP4 player, WebM player, TS streaming, adaptive bitrate, low latency, playback rate',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/byplay/og-image.png',
                description: 'ByPlay HLS Player interface screenshot',
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
                'Supports M3U8, MP4, WebM, OGG, TS, and MPD formats',
                'HLS streaming powered by hls.js',
                'Adaptive Bitrate (ABR) quality switching',
                'Low-latency live streaming mode',
                'Adjustable playback rate (0.25x–4x)',
                'Fine-grained buffer configuration',
                'Loading timeout and retry policy settings',
                'Real-time playback stats and event logs',
                'Responsive design for all devices',
                'Free to use, no registration required',
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
                  name: locale === 'zh' ? '首页' : 'Home',
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
              name: 'wudi',
              url: 'https://github.com/WuChenDi',
              logo: 'https://notes-wudi.pages.dev/images/logo.png',
              applicationCategory: 'MultimediaApplication',
              offers: {
                '@type': 'Offer',
                price: '0',
              },
              operatingSystem: 'Any',
              permissions: 'Browser access',
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            <Header />
            {children}
            <Footer />
            <Toaster richColors position="top-center" duration={3000} />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
