/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import type { Locale } from 'next-intl'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import '@cdlab996/ui/globals.css'
import { ClientProviders, Header } from '@/components/layout'
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
      alternates: { canonical: '/' },
      applicationName: 'M3U8 在线下载工具',
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
    }
  }

  return {
    title: 'M3U8 Online Downloader | Range Download, Streaming, AES Decryption',
    icons: 'https://notes-wudi.pages.dev/images/logo.png',
    description:
      'M3U8 online download tool with range download, streaming download, AES-128 decryption, and MP4 conversion. Completely free, no registration, browser-based processing.',
    keywords: [
      'M3U8 download',
      'M3U8 downloader',
      'HLS download',
      'video download',
      'TS merge',
      'MP4 convert',
      'AES decrypt',
      'stream download',
      'range download',
      'online tool',
      'HLS video download',
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
    alternates: { canonical: '/' },
    applicationName: 'M3U8 Online Downloader',
    openGraph: {
      title:
        'M3U8 Online Downloader - Range Download, Streaming, AES Decryption',
      description:
        'Powerful M3U8 online download tool with range download, streaming download, AES-128 decryption, and MP4 conversion. Completely free, browser-based.',
      url: 'https://m3u8dw.pages.dev/',
      siteName: 'M3U8 Download Tool',
      images: [
        {
          url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/m3u8dw/index.png',
          width: 1200,
          height: 630,
          alt: 'M3U8 Online Downloader Preview',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title:
        'M3U8 Online Downloader - Range Download, Streaming, AES Decryption',
      description:
        'Powerful M3U8 online download tool with range download, streaming download, AES-128 decryption, and MP4 conversion. Completely free.',
      images: [
        'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/m3u8dw/index.png',
      ],
      creator: '@wuchendi96',
      site: '@wuchendi96',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Enable static rendering
  setRequestLocale(locale)

  // Providing all messages to the client side
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            <Header />
            {children}
            <Toaster richColors position="top-center" duration={3000} />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
