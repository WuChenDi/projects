import { Toaster } from '@cdlab996/ui/components/sonner'
import Aurora from '@cdlab996/ui/reactbits/Aurora'
import Particles from '@cdlab996/ui/reactbits/Particles'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/app/providers'
import Footer from '@/components/footer'
import Header from '@/components/header'
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
  </>
)

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
        <Providers>
          <BackgroundEffects />
          <main className="flex flex-col min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
            <Header />
            <div className="container mx-auto px-4 py-12 flex flex-col items-center flex-1">
              {children}
            </div>
            <Footer />
            <Toaster richColors position="top-right" duration={3000} />
          </main>
        </Providers>
      </body>
    </html>
  )
}
