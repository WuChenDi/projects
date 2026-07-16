'use client'

import { Card } from '@cdlab/ui/components/card'
import { ScrollArea } from '@cdlab/ui/components/scroll-area'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Features, Hero, HowItWorks } from '@/components/landing'
import { AppFooter } from '@/components/layout/app-footer'
import { AppHeader } from '@/components/layout/app-header'
import { LocalCryptoPanel } from '@/components/local-crypto/LocalCryptoPanel'
import { useCryptoProcessor } from '@/hooks/useCryptoProcessor'

function HomeContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  // One shared engine. Encrypt vs decrypt is derived from the input, so there
  // are no tabs — you encrypt, optionally share a result, and retrieving just
  // feeds a shared ciphertext back into the same decrypt path.
  const crypto = useCryptoProcessor()

  // The page scroll uses the shared ScrollArea (consistent scrollbar). Watch its
  // viewport so the header can go transparent → solid on scroll.
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const viewport = containerRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    )
    if (!viewport) return
    const onScroll = () => setScrolled(viewport.scrollTop > 8)
    onScroll()
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={containerRef} className="h-svh">
      <ScrollArea className="h-full">
        <div className="flex min-h-svh flex-col bg-background text-foreground">
          <AppHeader
            crypto={crypto}
            initialCode={codeFromUrl}
            scrolled={scrolled}
          />

          <main className="flex-1">
            <Hero>
              <div className="px-4">
                <Card className="mx-auto w-full max-w-2xl gap-0 overflow-hidden p-0">
                  <LocalCryptoPanel crypto={crypto} />
                </Card>
              </div>
            </Hero>

            <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-16">
              <Features />
            </div>

            <div className="border-t border-border">
              <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-16">
                <HowItWorks />
              </div>
            </div>
          </main>

          <AppFooter />
        </div>
      </ScrollArea>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <Loader2 className="size-12 text-muted-foreground animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
