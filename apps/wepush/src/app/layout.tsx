import '@cdlab996/ui/globals.css'

import { Toaster } from '@cdlab996/ui/components/sonner'
import { IKFooter } from '@cdlab996/ui/IK'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ClientProviders, Header } from '@/components/layout'
import { PasswordGate } from '@/components/PasswordGate'

export const metadata: Metadata = {
  title: 'wepush',
  description: '微信公众号定时推送控制台',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const hasEnvPassword = (process.env.ACCESS_PASSWORD || '').length > 0

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ClientProviders>
          <PasswordGate hasEnvPassword={hasEnvPassword}>
            <Header />
            {children}
            <IKFooter year={2026} />
          </PasswordGate>
          <Toaster richColors position="top-right" />
        </ClientProviders>
      </body>
    </html>
  )
}
