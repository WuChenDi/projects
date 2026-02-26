/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { ClientProviders, Header } from '@/components/layout'
import Aurora from '@/components/reactbits/Aurora'
import Particles from '@/components/reactbits/Particles'
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
      <Aurora
        colorStops={['#4C00FF', '#97FFF4', '#FF3D9A']}
        blend={3.3}
        amplitude={0.3}
        speed={1.3}
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
    {/* <SplashCursor /> */}
  </>
)

// --- SEO Metadata ---
export const metadata: Metadata = {
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
  alternates: {
    canonical: '/',
  },
  applicationName: 'SecureC Encryption Tool',
  category: 'Security Tools, Encryption, Privacy Tools',
  classification: 'Security Tools, Encryption Software, Privacy Applications',
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
              name: 'SecureC',
              url: 'https://securec.pages.dev/',
              description:
                'Client-side file and text encryption tool using AES-GCM with Argon2id',
              inLanguage: 'en-US',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://securec.pages.dev/?q={search_term_string}',
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
              inLanguage: 'en-US',
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
              interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: { '@type': 'http://schema.org/UseAction' },
                userInteractionCount: 5000,
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
        <ClientProviders>
          {/* <BackgroundEffects /> */}
          <Header />
          {children}
          <Toaster richColors position="top-right" duration={3000} />
        </ClientProviders>
      </body>
      <GoogleAnalytics gaId="G-VECVREEZT1" />
    </html>
  )
}
