/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import '@cdlab996/ui/globals.css'
import { IKHeader } from '@cdlab996/ui/IK'
import { ClientProviders, ThemeToggle } from '@/components/layout'
import { PasswordGate } from '@/components/PasswordGate'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ByTTS - Free Online Text to Speech Converter',
  description:
    'ByTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features. Quickly convert text into natural and fluent speech.',
  icons: 'https://wcd.pages.dev/logo.png',
  keywords: [
    'text to speech',
    'TTS',
    'speech synthesis',
    'online dubbing',
    'OpenAI',
    'AI',
    'free TTS',
    'text-to-speech',
    'speech generator',
    'AI dubbing',
    'voice synthesis',
    'audio converter',
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
  creator: 'wudi',
  publisher: 'ByTTS',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  metadataBase: new URL('https://bytts.pages.dev/'),
  alternates: {
    canonical: '/',
  },
  applicationName: 'ByTTS',
  category: 'Utilities, Text to Speech, AI',
  classification: 'Text to Speech, Speech Synthesis',
  openGraph: {
    title: 'ByTTS - Free Online Text to Speech Converter',
    description:
      'ByTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features. Quickly convert text into natural and fluent speech.',
    url: 'https://bytts.pages.dev/',
    siteName: 'ByTTS',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bytts/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ByTTS - Free Online Text to Speech Converter',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ByTTS - Free Online Text to Speech Converter',
    description:
      'ByTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features. Quickly convert text into natural and fluent speech.',
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bytts/index.png',
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
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data - Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'ByTTS',
              url: 'https://bytts.pages.dev/',
              description:
                'ByTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features.',
              inLanguage: 'en',
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
              name: 'ByTTS',
              description:
                'Free online text-to-speech tool with multiple voice options, adjustable speed and pitch, instant preview, and download features.',
              url: 'https://bytts.pages.dev/',
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
              inLanguage: 'en',
              isAccessibleForFree: true,
              keywords:
                'text to speech, TTS, speech synthesis, online dubbing, OpenAI, AI, free TTS, text-to-speech, speech generator, AI dubbing, voice synthesis, audio converter',
              screenshot: {
                '@type': 'ImageObject',
                url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bytts/og-image.png',
                width: 1200,
                height: 630,
                alt: 'ByTTS - Free Online Text to Speech Converter',
              },
              softwareVersion: '1.0.0',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                reviewCount: '200',
                bestRating: '5',
                worstRating: '1',
              },
              featureList: [
                'Multiple voice options',
                'Adjustable speed and pitch',
                'Instant preview',
                'Download feature',
                'Free to use',
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

        {/* JSON-LD Structured Data - SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'ByTTS',
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
                  item: 'https://bytts.pages.dev/',
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
            <IKHeader
              brand="BYTTS"
              githubHref="https://github.com/WuChenDi/projects/tree/main/apps/bytts"
            >
              <ThemeToggle />
            </IKHeader>
            {children}
          </PasswordGate>
          <Toaster richColors position="top-right" duration={3000} />
        </ClientProviders>
      </body>
    </html>
  )
}
