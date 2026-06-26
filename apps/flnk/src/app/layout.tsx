import '@cdlab996/ui/globals.css'

import { Toaster } from '@cdlab996/ui/components/sonner'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import type { ReactNode } from 'react'
import { ClientProviders } from '@/components/layout'

export const metadata: Metadata = {
  title: {
    default: 'Flnk — privacy-first link shortener',
    template: '%s | Flnk',
  },
  description:
    'Privacy-first link shortener with geo / device routing and edge analytics, running on Cloudflare Workers.',
  applicationName: 'Flnk',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const locale = await getLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <ClientProviders>
            {children}
            <Toaster richColors position="top-right" />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
