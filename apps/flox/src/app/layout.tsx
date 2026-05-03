/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import fs from 'fs'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import path from 'path'
import type React from 'react'
import { Suspense } from 'react'

import '@cdlab996/ui/globals.css'
import { AdKeywordsInjector } from '@/components/AdKeywordsInjector'
import { FavoritesSidebar } from '@/components/favorites/FavoritesSidebar'
import { WatchHistorySidebar } from '@/components/history/WatchHistorySidebar'
import { ClientProviders, Header } from '@/components/layout'
import { PasswordGate } from '@/components/PasswordGate'
import { ScrollPositionManager } from '@/components/ScrollPositionManager'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { BackToTop } from '@/components/ui/BackToTop'
import { siteConfig } from '@/lib/config/site-config'

// Server Component specifically for reading env/file (async for best practices)
async function AdKeywordsWrapper() {
  let keywords: string[] = []

  try {
    // 1. Try reading from file (Docker runtime support)
    const keywordsFile = process.env.AD_KEYWORDS_FILE
    if (keywordsFile) {
      // Resolve absolute path or relative to CWD
      const filePath = path.isAbsolute(keywordsFile)
        ? keywordsFile
        : path.join(process.cwd(), keywordsFile)

      try {
        const content = await fs.promises.readFile(filePath, 'utf-8')
        keywords = content
          .split(/[\n,]/)
          .map((k: string) => k.trim())
          .filter((k: string) => k)
        console.log(
          `[AdFilter] Loaded ${keywords.length} keywords from file: ${filePath}`,
        )
      } catch (fileError: unknown) {
        // Handle file not found (ENOENT) gracefully
        if ((fileError as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn('[AdFilter] Error reading keywords file:', fileError)
        }
      }
    }

    // 2. Fallback to Env var (Runtime or Build time)
    if (keywords.length === 0) {
      const envKeywords =
        process.env.AD_KEYWORDS || process.env.NEXT_PUBLIC_AD_KEYWORDS
      if (envKeywords) {
        keywords = envKeywords
          .split(/[\n,]/)
          .map((k: string) => k.trim())
          .filter((k: string) => k)
      }
    }
  } catch (error) {
    console.warn('[AdFilter] Failed to load keywords:', error)
  }

  return <AdKeywordsInjector keywords={keywords} />
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  keywords: [
    '视频聚合',
    '在线视频',
    '视频搜索',
    '影视播放',
    '视频平台',
    'HLS播放',
    'M3U8播放',
    '流媒体',
    '免费影视',
    '在线观看',
    'video aggregator',
    'online video',
    'streaming player',
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
  creator: 'wudi',
  publisher: siteConfig.name,
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  metadataBase: new URL('https://flox.pages.dev/'),
  alternates: {
    canonical: '/',
  },
  applicationName: siteConfig.name,
  category: 'Video, Streaming, Entertainment',
  classification: 'Video Aggregator, Streaming Platform',
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: 'https://flox.pages.dev/',
    siteName: siteConfig.name,
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/flox/index.png',
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
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data - Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteConfig.name,
              url: 'https://flox.pages.dev/',
              description: siteConfig.description,
              inLanguage: 'zh-CN',
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
              name: siteConfig.name,
              description: siteConfig.description,
              url: 'https://flox.pages.dev/',
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
              inLanguage: 'zh-CN',
              isAccessibleForFree: true,
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
              name: siteConfig.name,
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
                  item: 'https://flox.pages.dev/',
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders>
          <PasswordGate hasEnvPassword={!!process.env.ACCESS_PASSWORD}>
            <AdKeywordsWrapper />
            <div className="min-h-screen">
              <Header />
              {children}
            </div>
            <BackToTop />
            <ScrollPositionManager />
            <Suspense fallback={null}>
              <FavoritesSidebar />
              <WatchHistorySidebar />
            </Suspense>
          </PasswordGate>
          <ServiceWorkerRegister />
          <Toaster richColors position="top-center" duration={3000} />
        </ClientProviders>
      </body>
    </html>
  )
}
