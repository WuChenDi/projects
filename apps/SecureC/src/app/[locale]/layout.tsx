/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import { GoogleAnalytics } from '@next/third-parties/google'
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
      title: 'SecureC - 客户端文件与文本加密工具 | AES-GCM 加密',
      icons: 'https://notes-wudi.pages.dev/images/logo.png',
      description:
        'SecureC 是一款强大的客户端加密工具，使用 AES-GCM 和 Argon2id 密钥派生进行安全的文件和文本加密/解密。免费使用，无需注册，隐私优先。',
      keywords: [
        'SecureC',
        '文件加密',
        '文本加密',
        '文件解密',
        '文本解密',
        'AES-GCM',
        'Argon2id',
        '客户端加密',
        '密码保护',
        '隐私工具',
        '安全加密',
        '浏览器加密',
        '零知识加密',
        '在线加密工具',
      ],
      referrer: 'no-referrer-when-downgrade',
      authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
      creator: 'wudi',
      publisher: 'SecureC',
      robots: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
      metadataBase: new URL('https://securec.pages.dev/'),
      alternates: { canonical: '/' },
      applicationName: 'SecureC 加密工具',
      openGraph: {
        title: 'SecureC - 客户端文件与文本加密工具',
        description:
          '强大的客户端加密工具，支持 AES-GCM 和 Argon2id 的文件和文本加密/解密。安全、私密、免费。',
        url: 'https://securec.pages.dev/',
        siteName: 'SecureC',
        images: [
          {
            url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/index.png',
            width: 1200,
            height: 630,
            alt: 'SecureC - 客户端加密工具界面预览',
          },
        ],
        locale: 'zh_CN',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'SecureC - 客户端文件与文本加密工具',
        description:
          '强大的客户端加密工具，支持 AES-GCM 和 Argon2id 的文件和文本加密/解密。安全、私密、免费。',
        images: [
          'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/index.png',
        ],
        creator: '@wuchendi96',
        site: '@wuchendi96',
      },
    }
  }

  return {
    title:
      'SecureC - Client-Side File & Text Encryption Tool | AES-GCM Encryption',
    icons: 'https://notes-wudi.pages.dev/images/logo.png',
    description:
      'SecureC is a powerful client-side tool for secure file and text encryption/decryption using AES-GCM with Argon2id key derivation. Free, no registration required, privacy-first encryption.',
    keywords: [
      'SecureC',
      'File encryption',
      'Text encryption',
      'File decryption',
      'Text decryption',
      'AES-GCM',
      'Argon2id',
      'Client-side encryption',
      'Password protection',
      'Privacy tools',
      'Secure encryption',
      'Browser encryption',
      'Zero-knowledge encryption',
      'Online encryption tool',
    ],
    referrer: 'no-referrer-when-downgrade',
    authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
    creator: 'wudi',
    publisher: 'SecureC',
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
    metadataBase: new URL('https://securec.pages.dev/'),
    alternates: { canonical: '/' },
    applicationName: 'SecureC Encryption Tool',
    category: 'Security Tools, Encryption, Privacy Tools',
    classification:
      'Security Tools, Encryption Software, Privacy Applications',
    openGraph: {
      title: 'SecureC - Client-Side File & Text Encryption Tool',
      description:
        'Powerful client-side encryption tool supporting file and text encryption/decryption using AES-GCM with Argon2id. Secure, private, and free to use.',
      url: 'https://securec.pages.dev/',
      siteName: 'SecureC',
      images: [
        {
          url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/index.png',
          width: 1200,
          height: 630,
          alt: 'SecureC - Client-Side Encryption Tool Interface',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'SecureC - Client-Side File & Text Encryption Tool',
      description:
        'Powerful client-side encryption tool supporting file and text encryption/decryption using AES-GCM with Argon2id. Secure, private, and free to use.',
      images: [
        'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/index.png',
      ],
      creator: '@wuchendi96',
      site: '@wuchendi96',
    },
    other: {
      'revisit-after': '7 days',
      distribution: 'global',
      rating: 'general',
      copyright: '© 2025 wudi. All rights reserved.',
      language: 'en-US',
      googlebot: 'index, follow',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: RootLayoutProps) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()

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
              name: 'SecureC',
              url: 'https://securec.pages.dev/',
              description:
                'Client-side file and text encryption tool using AES-GCM with Argon2id',
              inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
              potentialAction: {
                '@type': 'SearchAction',
                target:
                  'https://securec.pages.dev/?q={search_term_string}',
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
              name: 'SecureC',
              description:
                'Powerful client-side encryption tool for secure file and text encryption/decryption using AES-GCM with Argon2id key derivation.',
              url: 'https://securec.pages.dev/',
              applicationCategory: 'SecurityApplication',
              operatingSystem: 'Web',
              browserRequirements:
                'Requires JavaScript enabled. Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
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
                url: 'https://securec.pages.dev/',
              },
              datePublished: '2023-01-01',
              dateModified: '2025-01-15',
              inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
              isAccessibleForFree: true,
              keywords:
                'file encryption, text encryption, AES-GCM, Argon2id, client-side encryption, privacy tools',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/SecureC/index.png',
                description: 'SecureC Interface Screenshot',
              },
              softwareVersion: '1.0.0',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.9',
                ratingCount: '150',
                bestRating: '5',
                worstRating: '1',
              },
              featureList: [
                'Client-side AES-GCM encryption',
                'Argon2id key derivation',
                'File encryption and decryption',
                'Text encryption and decryption',
                'Zero-knowledge architecture',
                'No server-side storage',
                'Privacy-first design',
                'Free and open-source',
              ],
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
                  name: 'Home',
                  item: 'https://securec.pages.dev/',
                },
              ],
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
            <Toaster richColors position="top-right" duration={3000} />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
      <GoogleAnalytics gaId="G-VECVREEZT1" />
    </html>
  )
}
