'use client'

import { TooltipProvider } from '@cdlab/ui/components/tooltip'
import { IKVersionInfo } from '@cdlab/ui/IK'
import { ThemeProvider } from '@/components/layout/theme-provider'
import pkg from '../../../package.json'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>{children}</TooltipProvider>
      <IKVersionInfo
        name={pkg.name}
        version={pkg.version}
        buildTime={process.env.BUILD_TIME}
      />
    </ThemeProvider>
  )
}
