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
      title: 'Dropply - 安全文件分享平台',
      icons: 'https://notes-wudi.pages.dev/images/logo.png',
      description:
        '即时分享文件，军事级加密保护。无需账户，无追踪，纯粹的隐私保护。',
      keywords: [
        '文件分享',
        '加密传输',
        '安全分享',
        '隐私保护',
        '端到端加密',
        'Dropply',
        '文件传输',
        '在线分享',
      ],
      referrer: 'no-referrer-when-downgrade',
      authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
      creator: 'wudi',
      publisher: 'Dropply',
      robots: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
      metadataBase: new URL('https://dropply.pages.dev/'),
      alternates: { canonical: '/' },
      applicationName: 'Dropply',
      openGraph: {
        title: 'Dropply - 安全文件分享平台',
        description:
          '即时分享文件，军事级加密保护。无需账户，无追踪，纯粹的隐私保护。',
        url: 'https://dropply.pages.dev/',
        siteName: 'Dropply',
        images: [
          {
            url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/index.png',
            width: 1200,
            height: 630,
            alt: 'Dropply 安全文件分享平台界面预览',
          },
        ],
        locale: 'zh_CN',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Dropply - 安全文件分享平台',
        description:
          '即时分享文件，军事级加密保护。无需账户，无追踪，纯粹的隐私保护。',
        images: [
          'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/index.png',
        ],
        site: '@wuchendi96',
        creator: '@wuchendi96',
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
    title: 'Dropply - Secure File Sharing Platform',
    icons: 'https://notes-wudi.pages.dev/images/logo.png',
    description:
      'Share files instantly with military-grade encryption. No accounts, no tracking, just pure privacy.',
    keywords: [
      'file sharing',
      'encrypted transfer',
      'secure sharing',
      'privacy',
      'end-to-end encryption',
      'Dropply',
      'file transfer',
      'online sharing',
    ],
    referrer: 'no-referrer-when-downgrade',
    authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
    creator: 'wudi',
    publisher: 'Dropply',
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
    metadataBase: new URL('https://dropply.pages.dev/'),
    alternates: { canonical: '/' },
    applicationName: 'Dropply',
    category: 'File Sharing, Security, Privacy',
    classification: 'File Sharing, Security, Privacy',
    openGraph: {
      title: 'Dropply - Secure File Sharing Platform',
      description:
        'Share files instantly with military-grade encryption. No accounts, no tracking, just pure privacy.',
      url: 'https://dropply.pages.dev/',
      siteName: 'Dropply',
      images: [
        {
          url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/index.png',
          width: 1200,
          height: 630,
          alt: 'Dropply Secure File Sharing Platform interface preview',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Dropply - Secure File Sharing Platform',
      description:
        'Share files instantly with military-grade encryption. No accounts, no tracking, just pure privacy.',
      images: [
        'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/index.png',
      ],
      site: '@wuchendi96',
      creator: '@wuchendi96',
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
  const inLanguage = locale === 'zh' ? 'zh-CN' : 'en-US'

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
              name: 'Dropply',
              url: 'https://dropply.pages.dev/',
              description:
                'Secure file sharing platform with military-grade encryption. No accounts, no tracking, just pure privacy.',
              inLanguage,
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://dropply.pages.dev/?q={search_term_string}',
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
              name: 'Dropply',
              description:
                'Share files instantly with military-grade encryption. No accounts, no tracking, just pure privacy.',
              url: 'https://dropply.pages.dev/',
              applicationCategory: 'UtilitiesApplication',
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
                url: 'https://dropply.pages.dev/',
              },
              datePublished: '2024-01-01',
              dateModified: '2025-10-07',
              inLanguage,
              isAccessibleForFree: true,
              keywords:
                'file sharing, encrypted transfer, secure sharing, privacy, end-to-end encryption, file transfer',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/index.png',
                description: 'Dropply Secure File Sharing Platform screenshot',
              },
              softwareVersion: '2.0.0',
              featureList: [
                'Military-grade AES-256 encryption',
                'No account required',
                'No tracking or logging',
                'File and text sharing',
                'TOTP password protection',
                'Configurable expiry times',
                'End-to-end encrypted transfers',
                'Responsive design for all devices',
                'Free to use, no registration required',
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
                  name: locale === 'zh' ? '首页' : 'Home',
                  item: 'https://dropply.pages.dev/',
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
              applicationCategory: 'UtilitiesApplication',
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
            <Toaster richColors position="top-center" duration={3000} />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
