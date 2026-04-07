import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type React from 'react'
import '@cdlab996/ui/globals.css'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import fs from 'fs'
import path from 'path'
import { AdKeywordsInjector } from '@/components/AdKeywordsInjector'
import { PasswordGate } from '@/components/PasswordGate'
import { ScrollPositionManager } from '@/components/ScrollPositionManager'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { ClientProviders } from '@/components/layout'
import { BackToTop } from '@/components/ui/BackToTop'
import { siteConfig } from '@/lib/config/site-config'

// Server Component specifically for reading env/file (async for best practices)
async function AdKeywordsWrapper() {
  let keywords: string[] = []

  try {
    // 1. Try reading from file (Docker runtime support)
    const keywordsFile = process.env.AD_KEYWORDS_FILE
    if (keywordsFile) {
      // Resolve absolute path or relative to CWD
      const filePath = path.isAbsolute(keywordsFile)
        ? keywordsFile
        : path.join(process.cwd(), keywordsFile)

      try {
        const content = await fs.promises.readFile(filePath, 'utf-8')
        keywords = content
          .split(/[\n,]/)
          .map((k: string) => k.trim())
          .filter((k: string) => k)
        console.log(
          `[AdFilter] Loaded ${keywords.length} keywords from file: ${filePath}`,
        )
      } catch (fileError: unknown) {
        // Handle file not found (ENOENT) gracefully
        if ((fileError as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn('[AdFilter] Error reading keywords file:', fileError)
        }
      }
    }

    // 2. Fallback to Env var (Runtime or Build time)
    if (keywords.length === 0) {
      const envKeywords =
        process.env.AD_KEYWORDS || process.env.NEXT_PUBLIC_AD_KEYWORDS
      if (envKeywords) {
        keywords = envKeywords
          .split(/[\n,]/)
          .map((k: string) => k.trim())
          .filter((k: string) => k)
      }
    }
  } catch (error) {
    console.warn('[AdFilter] Failed to load keywords:', error)
  }

  return <AdKeywordsInjector keywords={keywords} />
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders>
          <PasswordGate hasEnvPassword={!!process.env.ACCESS_PASSWORD}>
            <AdKeywordsWrapper />
            {children}
            <BackToTop />
            <ScrollPositionManager />
          </PasswordGate>
          <Analytics />
          <ServiceWorkerRegister />
        </ClientProviders>

        {/* ARIA Live Region for Screen Reader Announcements */}
        <div
          id="aria-live-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Google Cast SDK */}
        <script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          async
        />

        {/* Scroll Performance Optimization Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                let scrollTimer;
                const body = document.body;

                function handleScroll() {
                  body.classList.add('scrolling');
                  clearTimeout(scrollTimer);
                  scrollTimer = setTimeout(function() {
                    body.classList.remove('scrolling');
                  }, 150);
                }

                let ticking = false;
                window.addEventListener('scroll', function() {
                  if (!ticking) {
                    window.requestAnimationFrame(function() {
                      handleScroll();
                      ticking = false;
                    });
                    ticking = true;
                  }
                }, { passive: true });
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
