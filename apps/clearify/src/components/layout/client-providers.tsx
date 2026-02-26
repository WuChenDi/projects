'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ThemeProvider } from '@/components/layout/theme-provider'

function ThemedBackground({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen w-full relative">
      {!mounted ? null : resolvedTheme === 'dark' ? (
        // <div
        //   className="absolute inset-0 z-[-1]"
        //   style={{
        //     background:
        //       'radial-gradient(125% 125% at 50% 100%, #000000 40%, #010133 100%)',
        //   }}
        // />
        <div
          className="absolute inset-0 z-[-1]"
          style={{
            background: `
          radial-gradient(ellipse 120% 80% at 70% 20%, rgba(255, 20, 147, 0.15), transparent 50%),
          radial-gradient(ellipse 100% 60% at 30% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
          radial-gradient(ellipse 90% 70% at 50% 0%, rgba(138, 43, 226, 0.18), transparent 65%),
          radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
          #000000
        `,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 z-[-1]"
          style={{
            background: `linear-gradient(225deg, #FFB3D9 0%, #FFD1DC 20%, #FFF0F5 40%, #E6F3FF 60%, #D1E7FF 80%, #C7E9F1 100%)`,
          }}
        />
      )}

      {children}
    </div>
  )
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ThemedBackground>{children}</ThemedBackground>
    </ThemeProvider>
  )
}
