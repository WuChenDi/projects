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

// --- SEO Metadata ---
export const metadata: Metadata = {
  title: 'Text to Speech | Free Online TTS Converter - CCTTS',
  icons: 'https://notes-wudi.pages.dev/images/logo.png',
  description:
    'CCTTS is a free online text-to-speech tool that supports multiple voice options, adjustable speed and pitch, instant preview, and download features. Quickly convert text into natural and fluent speech...',
  keywords: [
    'text to speech',
    'TTS',
    'speech synthesis',
    'online dubbing',
    'OpenAI',
    'AI',
    'FREE TTS',
    'text-to-speech',
    'speech generator',
    'AI dubbing',
    'free TTS',
  ],
  referrer: 'no-referrer-when-downgrade',
  authors: [{ name: 'wudi' }],
  robots: { index: true, follow: true },
  metadataBase: new URL('https://cctts.pages.dev/'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Text to Speech | Free Online TTS Converter - CCTTS',
    description: 'CCTTS is a free online text-to-speech tool...',
    url: '/',
    siteName: 'CCTTS',
    images: [
      {
        url: 'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/cctts/index.png',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Text to Speech | Free Online TTS Converter - CCTTS',
    description: 'CCTTS is a free online text-to-speech tool...',
    images: [
      'https://cdn.jsdelivr.net/gh/cdLab996/picture-lib/wudi/cctts/index.png',
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
    <html lang="en" suppressHydrationWarning>
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
