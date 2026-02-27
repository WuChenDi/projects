/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClientProviders, Footer, Header } from '@/components/layout'
import Particles from '@/components/reactbits/Particles'
import Plasma from '@/components/reactbits/Plasma'
import '@cdlab996/ui/globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const BackgroundEffects = () => (
  <>
    <div className="fixed inset-0">
      <Plasma
        color="#B19EEF"
        speed={1}
        direction="forward"
        scale={1}
        opacity={1}
        mouseInteractive={false}
      />
    </div>
    <div className="fixed inset-0">
      <Particles
        particleColors={['#ffffff', '#ffffff']}
        particleCount={400}
        particleSpread={10}
        speed={0.05}
        particleBaseSize={100}
        moveParticlesOnHover={false}
        alphaParticles={false}
        disableRotation={false}
      />
    </div>
  </>
)

export const metadata: Metadata = {
  metadataBase: new URL('https://values.pages.dev/'),
  title: 'Values',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  description:
    'A simple tool to compare the value of cryptocurrencies, fiat currencies, and products.',
  keywords: [
    'cryptocurrency',
    'fiat currency',
    'product value',
    'currency converter',
    'crypto rates',
    'fiat rates',
    'product comparison',
    'exchange rates',
    'financial tool',
    'investment analysis',
  ].join(', '),

  authors: [{ name: 'wudi', url: 'https://github.com/WuChenDi' }],
  creator: 'wudi',
  publisher: 'Values',

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  referrer: 'no-referrer-when-downgrade',
  openGraph: {
    title: 'Values',
    description:
      'A simple tool to compare the value of cryptocurrencies, fiat currencies, and products.',
    url: 'https://values.pages.dev/',
    siteName: 'Values',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/index.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Values',
    description:
      'A simple tool to compare the value of cryptocurrencies, fiat currencies, and products.',
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/index.png',
    ],
    creator: '@wuchendi96',
    site: '@wuchendi96',
  },
  alternates: {
    canonical: 'https://values.pages.dev/',
  },

  classification: 'Finance, Tools, Cryptocurrency, Currency Converter',

  // Additional SEO enhancements
  category: [
    'Finance',
    'Cryptocurrency',
    'Currency Converter',
    'Financial Tools',
    'Investment Tools',
    'Price Comparison',
  ].join(', '),

  // Add app-specific metadata
  applicationName: 'Values',

  // Schema.org structured data hints
  other: {
    'application-name': 'Values',

    // Additional meta tags for better discovery
    'google-site-verification': 'BfkYWH6vVbuslt3_LrpPEP95k1_EAw5FP_ykvTZUUx0',

    // Rich snippets hints
    'article:author': 'wudi',
    'article:publisher': 'https://github.com/WuChenDi',
    'article:section': '',
    'article:tag': '',
    'og:updated_time': new Date().toISOString(),

    'revisit-after': '7 days',
    distribution: 'global',
    rating: 'general',
    copyright: '© 2025 wudi. All rights reserved.',
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
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Values',
              url: 'https://values.pages.dev/',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Values',
              description:
                'A simple tool to compare the value of cryptocurrencies, fiat currencies, and products.',
              url: 'https://values.pages.dev/',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
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
                name: 'Values',
                url: 'https://values.pages.dev/',
              },
              datePublished: '2025-09-15',
              dateModified: new Date().toISOString(),
              inLanguage: 'en-US',
              isAccessibleForFree: true,
              keywords:
                'cryptocurrency comparison, fiat currency converter, product value calculator, crypto exchange rates, currency rates, financial comparison tool, investment calculator, price analysis, currency exchange, crypto prices',
              screenshot: [
                {
                  '@type': 'ImageObject',
                  contentUrl:
                    'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/value-vision/og-image.png',
                  description:
                    'A simple tool to compare the value of cryptocurrencies, fiat currencies, and products.',
                },
              ],
              softwareVersion: '2.0.0',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.9',
                ratingCount: '150',
                bestRating: '5',
                worstRating: '1',
              },
              sameAs: [
                'https://github.com/WuChenDi',
                'https://x.com/wuchendi96',
                'https://values.pages.dev/',
              ],

              featureList: [
                'Real-time cryptocurrency price comparison',
                'Multi-currency converter supporting fiat and crypto',
                'Product value comparison across currencies',
                'Live exchange rate updates',
                'Dark mode support',
                'Responsive design for all devices',
                'Free to use with no registration required',
              ],

              browserRequirements:
                'Requires JavaScript enabled. Compatible with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
              interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: { '@type': 'http://schema.org/ViewAction' },
                userInteractionCount: 5000,
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
      >
        <ClientProviders>
          <div className="container mx-auto min-h-screen flex flex-col">
            <BackgroundEffects />
            <Header />
            {children}
            <Footer />
            <Toaster richColors position="top-center" duration={3000} />
          </div>
        </ClientProviders>
      </body>
      <GoogleAnalytics gaId="G-FPHG7CDDVQ" />
    </html>
  )
}
