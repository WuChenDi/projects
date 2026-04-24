/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import '@cdlab996/ui/globals.css'
import { ClientProviders, Header } from '@/components/layout'
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
  title: 'BytTTS - Free Online Text to Speech Converter',
  description:
    'BytTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features. Quickly convert text into natural and fluent speech.',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
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
  publisher: 'BytTTS',
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
  applicationName: 'BytTTS',
  category: 'Utilities, Text to Speech, AI',
  classification: 'Text to Speech, Speech Synthesis',
  openGraph: {
    title: 'BytTTS - Free Online Text to Speech Converter',
    description:
      'BytTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features. Quickly convert text into natural and fluent speech.',
    url: 'https://bytts.pages.dev/',
    siteName: 'BytTTS',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/bytts/index.png',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BytTTS - Free Online Text to Speech Converter',
    description:
      'BytTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features. Quickly convert text into natural and fluent speech.',
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
              name: 'BytTTS',
              url: 'https://bytts.pages.dev/',
              description:
                'BytTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features.',
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
              name: 'BytTTS',
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
              name: 'BytTTS',
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
            <Header />
            {children}
          </PasswordGate>
          <Toaster richColors position="top-right" duration={3000} />
        </ClientProviders>
      </body>
    </html>
  )
}
