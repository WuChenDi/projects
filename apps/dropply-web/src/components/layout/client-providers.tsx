'use client'

import { TooltipProvider } from '@cdlab/ui/components/tooltip'
import { IKVersionInfo } from '@cdlab/ui/IK'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ThemeProvider } from '@/components/layout/theme-provider'
import pkg from '../../../package.json'

/** Plain neutral surface — the shared globals already paint `bg-background`. */
function ThemedBackground({ children }: { children: React.ReactNode }) {
  return <div className="relative min-h-screen w-full">{children}</div>
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <TooltipProvider>
          <ThemedBackground>{children}</ThemedBackground>
        </TooltipProvider>
        <IKVersionInfo
          name={pkg.name}
          version={pkg.version}
          buildTime={process.env.BUILD_TIME}
        />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
