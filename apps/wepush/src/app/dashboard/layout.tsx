import type { ReactNode } from 'react'
import { Header } from '@/components/layout'
import { PasswordGate } from '@/components/PasswordGate'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const hasEnvPassword = (process.env.ACCESS_PASSWORD || '').length > 0

  return (
    <PasswordGate hasEnvPassword={hasEnvPassword}>
      <Header />
      {children}
    </PasswordGate>
  )
}
