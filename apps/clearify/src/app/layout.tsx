/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { ClientProviders } from '@/components/layout/client-providers'
import { Header } from '@/components/layout/header'
import '@cdlab996/ui/globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Clearify',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  description: 'Powerful web-based tools for your image editing needs',
  keywords: [
    'image editing',
    'background removal',
    'AI tools',
    'photo editing',
    'online image editor',
    'Clearify',
    'web-based image tools',
    'free image editor',
    'AI image processing',
    'image enhancement',
    'image compression',
    'video compression',
    'transparent background',
    'remove bg',
    'photo background remover',
    'compress images online',
    'reduce file size',
    'browser-based tools',
    'privacy-focused image editor',
    'no upload image tools',
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
  creator: 'wudi',
  publisher: 'Clearify',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  metadataBase: new URL('https://clearify.pages.dev/'),
  alternates: {
    canonical: '/',
  },
  applicationName: 'Clearify',
  category: 'Image Editing Tools, AI Tools, Multimedia',
  classification: 'Media Editor, Image Tools, AI Technology',
  openGraph: {
    title: 'Clearify',
    description: 'Powerful web-based tools for your image editing needs',
    url: 'https://clearify.pages.dev/',
    siteName: 'Clearify',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/index.png',
        width: 1200,
        height: 630,
        alt: 'Clearify - AI Image Editing Tools Interface',
      },
    ],
    locale: 'en_US',
    type: 'website',
    countryName: 'Global',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clearify - AI-Powered Image Editing Tools',
    description:
      'Remove backgrounds, compress images and videos with AI. All processing happens locally in your browser.',
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/index.png',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Clearify',
              url: 'https://clearify.pages.dev/',
              description:
                'Powerful web-based AI tools for image editing. Remove backgrounds, compress images and videos.',
              inLanguage: 'en-US',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://clearify.pages.dev/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Clearify',
              description:
                'AI-powered image editing tools including background removal, image compression, and video compression. All processing happens locally in your browser for maximum privacy.',
              url: 'https://clearify.pages.dev/',
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
                name: 'Clearify',
                url: 'https://clearify.pages.dev/',
              },
              datePublished: '2024-01-01',
              dateModified: '2025-11-04',
              inLanguage: 'en-US',
              isAccessibleForFree: true,
              keywords:
                'AI image editing, background removal, image compression, video compression, browser-based tools, privacy-focused',
              screenshot: {
                '@type': 'ImageObject',
                contentUrl:
                  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Clearify/index.png',
                description:
                  'Clearify interface screenshot showing AI-powered image editing tools',
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
                'AI-powered background removal',
                'Image compression up to 90%',
                'Video compression',
                'Local browser processing - no uploads',
                'Support for JPEG, PNG, WebP formats',
                'Privacy-focused - all data stays on your device',
                'Free to use, no registration required',
                'Responsive design for all devices',
              ],
              interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: { '@type': 'http://schema.org/ViewAction' },
                userInteractionCount: 5000,
              },
              sameAs: [
                'https://github.com/WuChenDi',
                'https://x.com/wuchendi96',
              ],
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Clearify',
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
                  item: 'https://clearify.pages.dev/',
                },
              ],
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
      <GoogleAnalytics gaId="G-FPHG7CDDVQ" />
    </html>
  )
}
