'use client'

import { IKVersionInfo } from '@cdlab996/ui/IK'
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
      {children}
      <IKVersionInfo
        name={pkg.name}
        version={pkg.version}
        buildTime={process.env.BUILD_TIME}
      />
    </ThemeProvider>
  )
}
