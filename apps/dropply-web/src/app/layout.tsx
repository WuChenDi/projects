/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data */

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import '@cdlab996/ui/globals.css'
import { ClientProviders, Header } from '@/components/layout'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Dropply',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  description:
    'Share files instantly with military-grade encryption. No accounts, no tracking, just pure privacy.',
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
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi' }],
  robots: { index: true, follow: true },
  metadataBase: new URL('https://dropply.pages.dev/'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Dropply',
    description:
      'Share files instantly with military-grade encryption. No accounts, no tracking, just pure privacy.',
    url: '/',
    siteName: 'Dropply',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/index.png',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dropply',
    description:
      'Share files instantly with military-grade encryption. No accounts, no tracking, just pure privacy.',
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/Dropply/index.png',
    ],
    site: '@wuchendi96',
    creator: '@wuchendi96',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          <Header />
          {children}
          <Toaster richColors position="top-center" duration={3000} />
        </ClientProviders>
      </body>
    </html>
  )
}
