'use client'

import { TooltipProvider } from '@cdlab996/ui/components/tooltip'
import { IKVersionInfo } from '@cdlab996/ui/IK'
import { ThemeProvider } from '@/components/layout/theme-provider'
import pkg from '../../../package.json'

// The deck atmosphere (warm glow + scanlines + grain) is painted on <body>
// by theme.css; this shell only provides full-height layout context.
function DeckShell({ children }: { children: React.ReactNode }) {
  return <div className="relative min-h-screen w-full">{children}</div>
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <DeckShell>{children}</DeckShell>
      </TooltipProvider>
      <IKVersionInfo
        name={pkg.name}
        version={pkg.version}
        buildTime={process.env.BUILD_TIME}
      />
    </ThemeProvider>
  )
}
