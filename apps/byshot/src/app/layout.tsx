/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import '@/app/globals.css'

const SITE_NAME = 'Personal Photography Collection'
const SITE_TITLE = 'Personal Photography Collection | Chendi Wu'
const SITE_DESCRIPTION =
  'A curated collection of moments captured through my lens, powered by Next.js and Cloudinary.'
const SITE_URL = 'https://byshot.pages.dev/'
const SITE_IMAGE =
  'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/image-gallery/index.png'
const AUTHOR = {
  name: 'Chendi Wu',
  url: 'https://github.com/WuChenDi',
}
const KEYWORDS = [
  'Chendi Wu',
  'wuchendi',
  'wudi',
  'photography',
  'photo gallery',
  'personal portfolio',
  'image collection',
  'Cloudinary',
  'Next.js',
]
const SOCIAL_PROFILES = [
  'https://github.com/WuChenDi',
  'https://x.com/wuchendi96',
  'https://t.me/wuchendi96',
]

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  keywords: KEYWORDS,
  category: 'photography',
  referrer: 'no-referrer-when-downgrade',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: 'https://notes-wudi.pages.dev/images/logo.png',
    apple: '/images/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_IMAGE, alt: SITE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@wuchendi96',
    creator: '@wuchendi96',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_TITLE,
  alternateName: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'en-US',
  author: {
    '@type': 'Person',
    name: AUTHOR.name,
    url: AUTHOR.url,
  },
  publisher: {
    '@type': 'Person',
    name: AUTHOR.name,
    url: AUTHOR.url,
  },
}

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: AUTHOR.name,
  alternateName: ['wuchendi', 'wudi'],
  url: SITE_URL,
  image: SITE_IMAGE,
  description: SITE_DESCRIPTION,
  sameAs: SOCIAL_PROFILES,
}

function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(personJsonLd) }}
        />
      </head>
      <body className="bg-black antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
