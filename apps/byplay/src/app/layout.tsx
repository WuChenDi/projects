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
  alternates: {
    canonical: '/',
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
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
              inLanguage: 'en',
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
              inLanguage: 'en',
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
                  name: 'Home',
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
