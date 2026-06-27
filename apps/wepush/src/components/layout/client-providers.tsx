'use client'

import { TooltipProvider } from '@cdlab996/ui/components/tooltip'
import { IKVersionInfo } from '@cdlab996/ui/IK'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ThemeProvider } from '@/components/layout/theme-provider'
import pkg from '../../../package.json'

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
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <div className="relative min-h-screen w-full">{children}</div>
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
